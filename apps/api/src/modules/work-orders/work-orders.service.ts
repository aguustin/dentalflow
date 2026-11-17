import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { consumeReservations, releaseReservations, reserveStock } from '../../infrastructure/inventory/stock-ledger';
import { createDraftSale } from '../../infrastructure/sales/draft-sale';
import { DomainError } from '../../shared/contracts/errors/domain.error';
import { computeSaleTotals } from '../../shared/sales/sale-totals';
import {
  allowedTransitions,
  assertItemsEditable,
  assertTransition,
  OPEN_STATUSES,
} from './domain/work-order-rules';

export interface WorkOrderItemInput {
  catalogItemId?: string;
  /** Required for free-text lines (e.g. labor without a catalog entry) */
  description?: string;
  quantity: number;
  /** cents; defaults to the catalog price */
  unitPrice?: number;
}

const detailInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  asset: { select: { id: true, label: true, attributes: true } },
  staff: { select: { id: true, name: true } },
  items: {
    orderBy: { position: 'asc' },
    include: { catalogItem: { select: { type: true } } },
  },
  events: { orderBy: { createdAt: 'asc' } },
  sale: { select: { id: true, number: true, status: true } },
  reservations: { select: { catalogItemId: true, quantity: true } },
} satisfies Prisma.WorkOrderInclude;

type DetailRow = Prisma.WorkOrderGetPayload<{ include: typeof detailInclude }>;

const CHANGED = 'The work order was modified by someone else. Reload and try again.';

/** Repair work orders: intake, diagnosis, quote, approval, repair and delivery. */
@Injectable()
export class WorkOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    organizationId: string,
    q: { open?: boolean; status?: WorkOrderStatus; customerId?: string; search?: string; limit?: number },
  ) {
    const rows = await this.prisma.workOrder.findMany({
      where: {
        organizationId,
        ...(q.status ? { status: q.status } : q.open ? { status: { in: OPEN_STATUSES } } : {}),
        ...(q.customerId && { customerId: q.customerId }),
        ...(q.search && {
          OR: [
            { reportedIssue: { contains: q.search, mode: 'insensitive' } },
            { customer: { name: { contains: q.search, mode: 'insensitive' } } },
            { asset: { label: { contains: q.search, mode: 'insensitive' } } },
            ...(/^\d+$/.test(q.search) ? [{ number: Number(q.search) }] : []),
          ],
        }),
      },
      orderBy: { number: 'desc' },
      take: Math.min(q.limit ?? 200, 500),
      include: {
        customer: { select: { name: true } },
        asset: { select: { label: true } },
        staff: { select: { name: true } },
        items: { select: { quantity: true, unitPrice: true } },
      },
    });
    return rows.map((w) => ({
      id: w.id,
      number: w.number,
      status: w.status,
      customerName: w.customer.name,
      assetLabel: w.asset?.label ?? null,
      staffName: w.staff?.name ?? null,
      reportedIssue: w.reportedIssue,
      itemsTotal: w.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    }));
  }

  async get(id: string, organizationId: string) {
    return this.toDetail(await this.row(id, organizationId), organizationId);
  }

  async create(
    organizationId: string,
    userId: string,
    input: { customerId: string; assetId?: string; staffId?: string; reportedIssue: string; notes?: string },
  ) {
    await this.assertRefs(organizationId, input);
    const userName = await this.userName(userId);

    const id = await this.prisma.$transaction(async (tx) => {
      const [{ work_order_counter: number }] = await tx.$queryRaw<{ work_order_counter: number }[]>`
        UPDATE "organizations" SET "work_order_counter" = "work_order_counter" + 1
        WHERE "id" = ${organizationId} RETURNING "work_order_counter"`;
      const order = await tx.workOrder.create({
        data: {
          organizationId,
          number,
          customerId: input.customerId,
          assetId: input.assetId ?? null,
          staffId: input.staffId ?? null,
          reportedIssue: input.reportedIssue.trim(),
          notes: input.notes?.trim() || null,
          events: { create: { toStatus: 'RECEIVED', userId, userName } },
        },
        select: { id: true },
      });
      return order.id;
    });
    return this.get(id, organizationId);
  }

  /** Diagnosis, notes, technician and equipment can change while the order is open. */
  async update(
    id: string,
    organizationId: string,
    input: { diagnosis?: string | null; notes?: string | null; staffId?: string | null; assetId?: string | null },
  ) {
    const order = await this.row(id, organizationId);
    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
      throw new DomainError('CONFLICT', `A ${order.status.toLowerCase()} work order can't be edited`);
    }
    await this.assertRefs(organizationId, {
      customerId: order.customerId,
      assetId: input.assetId ?? undefined,
      staffId: input.staffId ?? undefined,
    });
    await this.prisma.workOrder.update({
      where: { id },
      data: {
        ...(input.diagnosis !== undefined && { diagnosis: input.diagnosis?.trim() || null }),
        ...(input.notes !== undefined && { notes: input.notes?.trim() || null }),
        ...(input.staffId !== undefined && { staffId: input.staffId }),
        ...(input.assetId !== undefined && { assetId: input.assetId }),
      },
    });
    return this.get(id, organizationId);
  }

  /** Replaces the quote lines (parts and labor). Only before quoting. */
  async replaceItems(id: string, organizationId: string, items: WorkOrderItemInput[]) {
    const order = await this.row(id, organizationId);
    assertItemsEditable(order.status);
    const lines = await this.resolveItems(organizationId, items);
    // Totals validation (quantities, prices) with the shared money rules
    computeSaleTotals(lines);

    await this.prisma.$transaction(async (tx) => {
      // Guard: still in the status we validated against
      const { count } = await tx.workOrder.updateMany({
        where: { id, status: order.status },
        data: { updatedAt: new Date() },
      });
      if (count === 0) throw new DomainError('CONFLICT', CHANGED);
      await tx.workOrderItem.deleteMany({ where: { workOrderId: id } });
      await tx.workOrderItem.createMany({
        data: lines.map((l, position) => ({ ...l, workOrderId: id, organizationId, position })),
      });
    });
    return this.get(id, organizationId);
  }

  async transition(id: string, organizationId: string, userId: string, to: WorkOrderStatus, note?: string) {
    const order = await this.row(id, organizationId);
    assertTransition(order.status, to, { itemCount: order.items.length, note });
    const userName = await this.userName(userId);

    // Status change, stock effects and history commit (or roll back) together
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.workOrder.updateMany({
        where: { id, status: order.status },
        data: { status: to },
      });
      if (count === 0) throw new DomainError('CONFLICT', CHANGED);

      if (to === 'APPROVED') {
        // Hold the parts: available stock goes down for everyone else (counter sales included)
        await reserveStock(
          tx,
          organizationId,
          id,
          order.items.flatMap((i) => (i.catalogItemId ? [{ catalogItemId: i.catalogItemId, quantity: i.quantity }] : [])),
        );
      } else if (to === 'CANCELLED') {
        await releaseReservations(tx, organizationId, id);
      } else if (to === 'DELIVERED' && order.status === 'READY') {
        await this.bill(tx, order, organizationId, userId);
      }

      await tx.workOrderEvent.create({
        data: { workOrderId: id, fromStatus: order.status, toStatus: to, note: note?.trim() || null, userId, userName },
      });
    });
    return this.get(id, organizationId);
  }

  /**
   * Delivery of a repaired order: a confirmed sale with the quote lines; the reserved parts
   * become real consumption of that sale. `saleId` is unique, so an order is billed once.
   */
  private async bill(tx: Prisma.TransactionClient, order: DetailRow, organizationId: string, userId: string) {
    const sale = await createDraftSale(tx, organizationId, {
      customerId: order.customerId,
      staffId: order.staffId,
      notes: `Orden de trabajo #${order.number}${order.asset ? ` · ${order.asset.label}` : ''}`,
      lines: order.items.map((i) => ({
        catalogItemId: i.catalogItemId,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    });
    await tx.sale.update({ where: { id: sale.id }, data: { status: 'CONFIRMED', confirmedAt: new Date() } });
    await consumeReservations(tx, organizationId, order.id, sale.id, userId);
    await tx.workOrder.update({ where: { id: order.id }, data: { saleId: sale.id } });
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private async row(id: string, organizationId: string): Promise<DetailRow> {
    const order = await this.prisma.workOrder.findFirst({ where: { id, organizationId }, include: detailInclude });
    if (!order) throw new NotFoundException('Work order not found');
    return order;
  }

  private async toDetail(w: DetailRow, organizationId: string) {
    const { taxRateBps } = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { taxRateBps: true },
    });
    const totals = computeSaleTotals(w.items, 0, taxRateBps);
    return {
      id: w.id,
      number: w.number,
      status: w.status,
      allowedTransitions: allowedTransitions(w.status),
      customer: w.customer,
      asset: w.asset,
      staff: w.staff,
      reportedIssue: w.reportedIssue,
      diagnosis: w.diagnosis,
      notes: w.notes,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
      items: w.items.map((i, idx) => ({
        id: i.id,
        catalogItemId: i.catalogItemId,
        kind: i.catalogItem?.type ?? null,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: totals.lines[idx].total,
      })),
      totals: { subtotal: totals.subtotal, taxRateBps, taxTotal: totals.taxTotal, total: totals.total },
      sale: w.sale,
      reservations: w.reservations,
      events: w.events.map((e) => ({
        id: e.id,
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        note: e.note,
        userName: e.userName,
        createdAt: e.createdAt,
      })),
    };
  }

  private async resolveItems(organizationId: string, items: WorkOrderItemInput[]) {
    const ids = [...new Set(items.flatMap((i) => (i.catalogItemId ? [i.catalogItemId] : [])))];
    const catalog = new Map(
      (
        await this.prisma.catalogItem.findMany({
          where: { id: { in: ids }, organizationId, isActive: true },
          select: { id: true, name: true, price: true, isVariantGroup: true },
        })
      ).map((c) => [c.id, c]),
    );
    return items.map((item, i) => {
      const ref = item.catalogItemId ? catalog.get(item.catalogItemId) : undefined;
      if (item.catalogItemId && !ref) throw new NotFoundException(`Catalog item '${item.catalogItemId}' not found`);
      if (ref?.isVariantGroup) throw new DomainError('INVALID', `'${ref.name}' has variants — choose one`);
      const description = item.description?.trim() || ref?.name;
      if (!description) throw new DomainError('INVALID', `line ${i + 1}: description is required for free-text lines`);
      const unitPrice = item.unitPrice ?? ref?.price;
      if (unitPrice === undefined) throw new DomainError('INVALID', `line ${i + 1}: unitPrice is required for free-text lines`);
      return { catalogItemId: ref?.id ?? null, description, quantity: item.quantity, unitPrice };
    });
  }

  /** Customer, equipment (must belong to that customer) and technician must be of this organization. */
  private async assertRefs(organizationId: string, r: { customerId: string; assetId?: string; staffId?: string }) {
    const customer = await this.prisma.customer.count({ where: { id: r.customerId, organizationId } });
    if (!customer) throw new NotFoundException('Customer not found');
    if (r.assetId) {
      const asset = await this.prisma.asset.count({ where: { id: r.assetId, organizationId, customerId: r.customerId } });
      if (!asset) throw new NotFoundException("Equipment not found for this customer");
    }
    if (r.staffId) {
      const staff = await this.prisma.staffMember.count({ where: { id: r.staffId, organizationId, isActive: true } });
      if (!staff) throw new NotFoundException('Technician not found');
    }
  }

  private async userName(userId: string): Promise<string> {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { firstName: true, lastName: true } });
    return `${u.firstName} ${u.lastName}`.trim();
  }
}
