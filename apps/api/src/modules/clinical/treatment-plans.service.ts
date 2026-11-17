import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TreatmentItemStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { createDraftSale } from '../../infrastructure/sales/draft-sale';
import { DomainError } from '../../shared/contracts/errors/domain.error';
import { isValidTooth, SURFACES } from './domain/odontogram';
import { assertEditable, assertTransition, isBillable, planTotals } from './domain/treatment-plan';

const planInclude = {
  items: {
    orderBy: { position: 'asc' },
    include: { sale: { select: { id: true, number: true, status: true } } },
  },
} satisfies Prisma.TreatmentPlanInclude;

type PlanRow = Prisma.TreatmentPlanGetPayload<{ include: typeof planInclude }>;

export interface ItemInput {
  catalogItemId: string;
  tooth?: number | null;
  surface?: string | null;
  /** cents; defaults to the catalog price */
  price?: number;
}

const CHANGED = 'The item was modified by someone else. Reload and try again.';

function toDto(plan: PlanRow) {
  const items = plan.items.map((i) => ({
    id: i.id,
    catalogItemId: i.catalogItemId,
    description: i.description,
    tooth: i.tooth,
    surface: i.surface,
    price: i.price,
    status: i.status,
    doneAt: i.doneAt,
    sale: i.sale,
    billable: isBillable({ status: i.status, saleStatus: i.sale?.status ?? null }),
  }));
  return {
    id: plan.id,
    title: plan.title,
    notes: plan.notes,
    createdAt: plan.createdAt,
    items,
    totals: planTotals(items.map((i) => ({ status: i.status, price: i.price, saleStatus: i.sale?.status ?? null }))),
  };
}

/** Treatment plans (quotes) per patient, and billing their done items into a sale. */
@Injectable()
export class TreatmentPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async list(customerId: string, organizationId: string) {
    await this.customer(customerId, organizationId);
    const plans = await this.prisma.treatmentPlan.findMany({
      where: { customerId, organizationId },
      orderBy: { createdAt: 'desc' },
      include: planInclude,
    });
    return plans.map(toDto);
  }

  async create(
    customerId: string,
    organizationId: string,
    userId: string,
    input: { title: string; notes?: string; items?: ItemInput[] },
  ) {
    await this.customer(customerId, organizationId);
    const lines = await this.resolveItems(organizationId, input.items ?? []);
    const plan = await this.prisma.treatmentPlan.create({
      data: {
        organizationId,
        customerId,
        title: input.title.trim(),
        notes: input.notes?.trim() || null,
        createdBy: userId,
        items: { create: lines.map((l, position) => ({ ...l, organizationId, position })) },
      },
      include: planInclude,
    });
    return toDto(plan);
  }

  async addItem(planId: string, customerId: string, organizationId: string, input: ItemInput) {
    const plan = await this.plan(planId, customerId, organizationId);
    const [line] = await this.resolveItems(organizationId, [input]);
    await this.prisma.treatmentPlanItem.create({
      data: { ...line, planId, organizationId, position: plan.items.length },
    });
    return toDto(await this.plan(planId, customerId, organizationId));
  }

  async updateItem(
    planId: string,
    itemId: string,
    customerId: string,
    organizationId: string,
    change: { status?: TreatmentItemStatus; price?: number; tooth?: number | null; surface?: string | null },
  ) {
    const plan = await this.plan(planId, customerId, organizationId);
    const item = plan.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Treatment item not found');

    const editsDetails = change.price !== undefined || change.tooth !== undefined || change.surface !== undefined;
    if (editsDetails) {
      assertEditable(item.status);
      validatePosition(change.tooth ?? item.tooth, change.surface !== undefined ? change.surface : item.surface);
    }
    if (change.status && change.status !== item.status) assertTransition(item.status, change.status);

    // Conditional on the status that was read (optimistic concurrency)
    const { count } = await this.prisma.treatmentPlanItem.updateMany({
      where: { id: itemId, status: item.status },
      data: {
        ...(change.status && { status: change.status, doneAt: change.status === 'DONE' ? new Date() : null }),
        ...(change.price !== undefined && { price: change.price }),
        ...(change.tooth !== undefined && { tooth: change.tooth }),
        ...(change.surface !== undefined && { surface: change.surface }),
      },
    });
    if (count === 0) throw new DomainError('CONFLICT', CHANGED);
    return toDto(await this.plan(planId, customerId, organizationId));
  }

  /**
   * Bills done, not-yet-billed items into a new DRAFT sale. The sale creation and the
   * marking of the items happen in one transaction: an item is never billed twice,
   * even with concurrent requests (the conditional update re-checks under row locks).
   */
  async bill(planId: string, customerId: string, organizationId: string, itemIds?: string[]) {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { enabledModules: true },
    });
    if (!org.enabledModules.includes('sales')) throw new ForbiddenException("Module 'sales' is not enabled");

    const plan = await this.plan(planId, customerId, organizationId);
    const candidates = plan.items.filter(
      (i) => isBillable({ status: i.status, saleStatus: i.sale?.status ?? null }) && (!itemIds || itemIds.includes(i.id)),
    );
    if (candidates.length === 0) throw new DomainError('INVALID', 'There are no done items pending billing');
    const ids = candidates.map((i) => i.id);

    return this.prisma.$transaction(async (tx) => {
      const sale = await createDraftSale(tx, organizationId, {
        customerId,
        notes: `Plan de tratamiento: ${plan.title}`,
        lines: candidates.map((i) => ({
          catalogItemId: i.catalogItemId,
          description: describe(i),
          quantity: 1,
          unitPrice: i.price,
        })),
      });
      const { count } = await tx.treatmentPlanItem.updateMany({
        where: {
          id: { in: ids },
          status: 'DONE',
          OR: [{ saleId: null }, { sale: { status: 'VOIDED' } }],
        },
        data: { saleId: sale.id },
      });
      if (count !== ids.length) {
        throw new DomainError('CONFLICT', 'Some items were just billed by someone else. Reload and try again.');
      }
      return { saleId: sale.id, saleNumber: sale.number };
    });
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private async resolveItems(organizationId: string, items: ItemInput[]) {
    if (items.length === 0) return [];
    const ids = [...new Set(items.map((i) => i.catalogItemId))];
    const services = await this.prisma.catalogItem.findMany({
      where: { id: { in: ids }, organizationId, isActive: true, type: 'SERVICE' },
      select: { id: true, name: true, price: true },
    });
    const byId = new Map(services.map((s) => [s.id, s]));
    return items.map((i) => {
      const service = byId.get(i.catalogItemId);
      if (!service) throw new NotFoundException(`Service '${i.catalogItemId}' not found in this organization`);
      validatePosition(i.tooth ?? null, i.surface ?? null);
      return {
        catalogItemId: service.id,
        description: service.name,
        tooth: i.tooth ?? null,
        surface: i.surface ?? null,
        price: i.price ?? service.price,
      };
    });
  }

  private async plan(planId: string, customerId: string, organizationId: string): Promise<PlanRow> {
    const plan = await this.prisma.treatmentPlan.findFirst({
      where: { id: planId, customerId, organizationId },
      include: planInclude,
    });
    if (!plan) throw new NotFoundException('Treatment plan not found');
    return plan;
  }

  private async customer(customerId: string, organizationId: string) {
    const exists = await this.prisma.customer.count({ where: { id: customerId, organizationId } });
    if (!exists) throw new NotFoundException('Customer not found');
  }
}

function validatePosition(tooth: number | null, surface: string | null) {
  if (tooth !== null && !isValidTooth(tooth)) throw new DomainError('INVALID', `Invalid FDI tooth number ${tooth}`);
  if (surface !== null) {
    if (tooth === null) throw new DomainError('INVALID', 'A surface requires a tooth');
    if (!(SURFACES as readonly string[]).includes(surface)) throw new DomainError('INVALID', `Invalid surface '${surface}'`);
  }
}

/** "Obturación · pieza 16 (O)" */
function describe(i: { description: string; tooth: number | null; surface: string | null }) {
  if (i.tooth === null) return i.description;
  return `${i.description} · pieza ${i.tooth}${i.surface ? ` (${i.surface})` : ''}`;
}
