import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethod, SaleStatus } from '@prisma/client';
import { DomainError } from '../../../shared/contracts/errors/domain.error';
import {
  assertCanConfirm,
  assertCanPay,
  assertCanVoid,
  assertEditable,
  computeSaleTotals,
  statusAfterPayment,
} from '../domain/sale-rules';
import { SaleRow, SaleWriteData, SalesRepository } from '../infrastructure/sales.repository';

export interface SaleLineInput {
  catalogItemId?: string;
  /** Required for free-text lines; defaults to the catalog item's name */
  description?: string;
  quantity: number;
  /** Defaults to the catalog item's current price */
  unitPrice?: number;
  discount?: number;
  /** Serial numbers of the units sold (checkout only); one per unit */
  serials?: string[];
}

export interface SaleInput {
  customerId?: string | null;
  staffId?: string | null;
  notes?: string | null;
  globalDiscount?: number;
  items: SaleLineInput[];
}

const CHANGED = 'The sale was modified by someone else. Reload and try again.';

@Injectable()
export class SalesService {
  constructor(private readonly repo: SalesRepository) {}

  async get(id: string, organizationId: string) {
    return toDetail(await this.getRow(id, organizationId));
  }

  async list(
    organizationId: string,
    q: { status?: SaleStatus; customerId?: string; from?: Date; to?: Date; limit?: number; offset?: number },
  ) {
    const limit = Math.min(q.limit ?? 20, 100);
    const offset = q.offset ?? 0;
    const { rows, total } = await this.repo.list(organizationId, { ...q, limit, offset });
    return {
      items: rows.map((s) => ({
        id: s.id,
        number: s.number,
        status: s.status,
        customerId: s.customerId,
        customerName: s.customer?.name ?? null,
        staffName: s.staff?.name ?? null,
        total: s.total,
        paidTotal: s.paidTotal,
        balance: s.total - s.paidTotal,
        createdAt: s.createdAt,
      })),
      total,
      limit,
      offset,
    };
  }

  async create(organizationId: string, input: SaleInput, opts: { confirm?: boolean; userId?: string } = {}) {
    const data = await this.build(organizationId, input);
    let sale = await this.repo.create(organizationId, data);
    // If confirming fails (e.g. no stock) the draft remains, so the user can fix it
    if (opts.confirm) {
      try {
        sale = await this.confirmRow(sale, opts.userId);
      } catch (err) {
        // Tell the client which draft was kept so it can open it instead of creating another
        if (err instanceof DomainError) {
          throw new DomainError(err.code, err.message, { ...err.context, saleId: sale.id });
        }
        throw err;
      }
    }
    return toDetail(sale);
  }

  async update(id: string, organizationId: string, input: SaleInput) {
    const current = await this.getRow(id, organizationId);
    assertEditable(current.status);
    const data = await this.build(organizationId, input);
    if (!(await this.repo.replaceDraft(id, data))) throw new ConflictException(CHANGED);
    return this.get(id, organizationId);
  }

  async confirm(id: string, organizationId: string, userId?: string) {
    return toDetail(await this.confirmRow(await this.getRow(id, organizationId), userId));
  }

  async void(id: string, organizationId: string, userId?: string) {
    const sale = await this.getRow(id, organizationId);
    assertCanVoid(sale.status, sale.paidTotal);
    if (!(await this.repo.void(id, organizationId, sale.status, userId))) {
      throw new ConflictException(CHANGED);
    }
    return this.get(id, organizationId);
  }

  async addPayment(
    id: string,
    organizationId: string,
    userId: string,
    payment: { method: PaymentMethod; amount: number },
  ) {
    const sale = await this.getRow(id, organizationId);
    assertCanPay(sale.status, sale.total, sale.paidTotal, payment.amount);
    const ok = await this.repo.addPayment({
      saleId: id,
      organizationId,
      expectedStatus: sale.status,
      expectedPaidTotal: sale.paidTotal,
      newStatus: statusAfterPayment(sale.total, sale.paidTotal + payment.amount),
      amount: payment.amount,
      method: payment.method,
      userId,
    });
    if (!ok) throw new ConflictException(CHANGED);
    return this.get(id, organizationId);
  }

  /** Point of sale: create, take stock and collect the full amount atomically. */
  async checkout(organizationId: string, userId: string, input: SaleInput, method: PaymentMethod) {
    if (input.items.length === 0) throw new DomainError('INVALID', 'The cart is empty');
    const serials = input.items.map((item, i) => {
      if (!item.serials?.length) return undefined;
      const list = [...new Set(item.serials.map((s) => s.trim()).filter(Boolean))];
      if (list.length !== item.quantity) {
        throw new DomainError('INVALID', `line ${i + 1}: enter one distinct serial number per unit (${item.quantity})`);
      }
      return list;
    });
    const data = await this.build(organizationId, input);
    return toDetail(await this.repo.checkout(organizationId, data, { method }, userId, serials));
  }

  /** Draft sale for a completed appointment, with its booked service as the first line. */
  async createFromAppointment(appointmentId: string, organizationId: string) {
    const appointment = await this.repo.findAppointment(appointmentId, organizationId);
    if (!appointment) throw new NotFoundException('Appointment not found');
    if (appointment.status !== 'COMPLETED') {
      throw new DomainError('CONFLICT', 'Only completed appointments can be billed');
    }
    const existing = await this.repo.findByAppointment(appointmentId, organizationId);
    if (existing) {
      throw new DomainError('CONFLICT', 'This appointment already has a sale', { saleId: existing.id });
    }

    const items: SaleLineInput[] = appointment.service
      ? [{ catalogItemId: appointment.service.id, quantity: 1 }]
      : [];
    const data = await this.build(organizationId, {
      customerId: appointment.customerId,
      staffId: appointment.staffId,
      notes: appointment.title,
      items,
    });
    const sale = await this.repo
      .create(organizationId, { ...data, appointmentId })
      .catch((err: unknown) => {
        // Unique appointment_id: another request billed it concurrently
        if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2002') {
          throw new DomainError('CONFLICT', 'This appointment already has a sale');
        }
        throw err;
      });
    return toDetail(sale);
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private async getRow(id: string, organizationId: string): Promise<SaleRow> {
    const sale = await this.repo.findById(id, organizationId);
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  private async confirmRow(sale: SaleRow, userId?: string): Promise<SaleRow> {
    assertCanConfirm(sale.status, sale.items.length);
    if (!(await this.repo.confirm(sale.id, sale.organizationId, userId))) {
      throw new ConflictException(CHANGED);
    }
    return this.getRow(sale.id, sale.organizationId);
  }

  /** Resolves references and catalog prices, then computes totals (server is authoritative). */
  private async build(organizationId: string, input: SaleInput): Promise<SaleWriteData> {
    if (input.customerId && !(await this.repo.customerExists(input.customerId, organizationId))) {
      throw new NotFoundException('Customer not found in this organization');
    }
    if (input.staffId && !(await this.repo.staffExists(input.staffId, organizationId))) {
      throw new NotFoundException('Staff member not found in this organization');
    }

    const ids = [...new Set(input.items.flatMap((i) => (i.catalogItemId ? [i.catalogItemId] : [])))];
    const catalog = new Map((await this.repo.findCatalogItems(ids, organizationId)).map((c) => [c.id, c]));
    const missing = ids.filter((id) => !catalog.has(id));
    if (missing.length > 0) throw new NotFoundException(`Catalog items not found or inactive: ${missing.join(', ')}`);

    const resolved = input.items.map((item, i) => {
      const ref = item.catalogItemId ? catalog.get(item.catalogItemId) : undefined;
      if (ref?.isVariantGroup) {
        throw new DomainError('INVALID', `line ${i + 1}: '${ref.name}' has variants — choose one (size, color…)`);
      }
      const description = item.description?.trim() || ref?.name;
      if (!description) throw new DomainError('INVALID', `line ${i + 1}: description is required for free-text lines`);
      const unitPrice = item.unitPrice ?? ref?.price;
      if (unitPrice === undefined) throw new DomainError('INVALID', `line ${i + 1}: unitPrice is required for free-text lines`);
      return { catalogItemId: ref?.id ?? null, description, quantity: item.quantity, unitPrice, discount: item.discount ?? 0 };
    });

    const taxRateBps = await this.repo.organizationTaxRate(organizationId);
    const globalDiscount = input.globalDiscount ?? 0;
    const totals = computeSaleTotals(resolved, globalDiscount, taxRateBps);

    return {
      customerId: input.customerId ?? null,
      staffId: input.staffId ?? null,
      notes: input.notes?.trim() || null,
      globalDiscount,
      taxRateBps,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      lines: resolved.map((l, i) => ({ ...l, total: totals.lines[i].total })),
    };
  }
}

function toDetail(s: SaleRow) {
  return {
    id: s.id,
    number: s.number,
    status: s.status,
    customerId: s.customerId,
    customerName: s.customer?.name ?? null,
    staffId: s.staffId,
    staffName: s.staff?.name ?? null,
    appointmentId: s.appointmentId,
    notes: s.notes,
    subtotal: s.subtotal,
    discountTotal: s.discountTotal,
    globalDiscount: s.globalDiscount,
    taxRateBps: s.taxRateBps,
    taxTotal: s.taxTotal,
    total: s.total,
    paidTotal: s.paidTotal,
    balance: s.total - s.paidTotal,
    refundedTotal: s.refundedTotal,
    confirmedAt: s.confirmedAt,
    voidedAt: s.voidedAt,
    createdAt: s.createdAt,
    items: s.items.map((i) => ({
      id: i.id,
      catalogItemId: i.catalogItemId,
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discount: i.discount,
      total: i.total,
      returnedQuantity: i.returnedQuantity,
      serials: i.serials,
    })),
    payments: s.payments.map((p) => ({ id: p.id, method: p.method, amount: p.amount, createdAt: p.createdAt })),
    returns: s.returns.map((r) => ({
      id: r.id,
      reason: r.reason,
      refundTotal: r.refundTotal,
      refundMethod: r.refundMethod,
      createdAt: r.createdAt,
      items: r.items,
    })),
  };
}
