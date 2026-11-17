import { Injectable } from '@nestjs/common';
import { PaymentMethod, Prisma, SaleStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { restoreStockForSale, takeStockForSale } from '../../../infrastructure/inventory/stock-ledger';
import { nextSaleNumber } from '../../../infrastructure/sales/draft-sale';

export interface SaleLineData {
  catalogItemId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface SaleWriteData {
  customerId: string | null;
  staffId: string | null;
  appointmentId?: string | null;
  notes: string | null;
  globalDiscount: number;
  taxRateBps: number;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  lines: SaleLineData[];
}

const detailInclude = {
  items: { orderBy: { position: 'asc' } },
  payments: { orderBy: { createdAt: 'asc' } },
  customer: { select: { name: true } },
  staff: { select: { name: true } },
} satisfies Prisma.SaleInclude;

export type SaleRow = Prisma.SaleGetPayload<{ include: typeof detailInclude }>;

const linesCreate = (lines: SaleLineData[]) => ({
  create: lines.map((l, position) => ({ ...l, position })),
});

/**
 * Persistence for sales. State-changing writes are conditional on the state that was read
 * (optimistic concurrency): if another request changed the sale in between, they return false.
 */
@Injectable()
export class SalesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string, organizationId: string): Promise<SaleRow | null> {
    return this.prisma.sale.findFirst({ where: { id, organizationId }, include: detailInclude });
  }

  findByAppointment(appointmentId: string, organizationId: string) {
    return this.prisma.sale.findFirst({ where: { appointmentId, organizationId }, select: { id: true } });
  }

  async list(
    organizationId: string,
    q: { status?: SaleStatus; customerId?: string; from?: Date; to?: Date; limit: number; offset: number },
  ) {
    const where: Prisma.SaleWhereInput = {
      organizationId,
      ...(q.status && { status: q.status }),
      ...(q.customerId && { customerId: q.customerId }),
      ...((q.from || q.to) && { createdAt: { ...(q.from && { gte: q.from }), ...(q.to && { lt: q.to }) } }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.sale.findMany({
        where,
        orderBy: { number: 'desc' },
        take: q.limit,
        skip: q.offset,
        include: { customer: { select: { name: true } }, staff: { select: { name: true } } },
      }),
      this.prisma.sale.count({ where }),
    ]);
    return { rows, total };
  }

  /** Creates a sale with the next sequential number of the organization (atomic counter). */
  create(organizationId: string, data: SaleWriteData): Promise<SaleRow> {
    const { lines, ...sale } = data;
    return this.prisma.$transaction(async (tx) => {
      const number = await nextSaleNumber(tx, organizationId);
      return tx.sale.create({
        data: { organizationId, number, ...sale, items: linesCreate(lines) },
        include: detailInclude,
      });
    });
  }

  /** Replaces a draft's content. Returns false if it is no longer a draft. */
  replaceDraft(id: string, data: SaleWriteData): Promise<boolean> {
    const { lines, appointmentId: _ignored, ...sale } = data;
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.sale.updateMany({ where: { id, status: 'DRAFT' }, data: sale });
      if (count === 0) return false;
      await tx.saleItem.deleteMany({ where: { saleId: id } });
      await tx.saleItem.createMany({ data: lines.map((l, position) => ({ ...l, position, saleId: id })) });
      return true;
    });
  }

  /**
   * DRAFT → CONFIRMED and take stock, atomically. Returns false if it was no longer a draft;
   * throws (rolling everything back) if there isn't enough stock.
   */
  confirm(id: string, organizationId: string, userId?: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.sale.updateMany({
        where: { id, organizationId, status: 'DRAFT' },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      });
      if (count === 0) return false;
      const items = await tx.saleItem.findMany({
        where: { saleId: id, catalogItemId: { not: null } },
        select: { catalogItemId: true, quantity: true },
      });
      await takeStockForSale(
        tx,
        organizationId,
        id,
        items.map((i) => ({ catalogItemId: i.catalogItemId!, quantity: i.quantity })),
        userId,
      );
      return true;
    });
  }

  /** Voids a sale without payments and gives back any stock it took, atomically. */
  void(id: string, organizationId: string, from: SaleStatus, userId?: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.sale.updateMany({
        where: { id, organizationId, status: from, paidTotal: 0 },
        data: { status: 'VOIDED', voidedAt: new Date() },
      });
      if (count === 0) return false;
      await restoreStockForSale(tx, organizationId, id, userId);
      return true;
    });
  }

  /**
   * Point-of-sale checkout: sale (already paid), stock and payment in ONE transaction.
   * If stock is short nothing is created (unlike create+confirm, which keeps a draft).
   */
  checkout(
    organizationId: string,
    data: SaleWriteData,
    payment: { method: PaymentMethod },
    userId: string,
  ): Promise<SaleRow> {
    const { lines, appointmentId: _ignored, ...sale } = data;
    return this.prisma.$transaction(async (tx) => {
      const number = await nextSaleNumber(tx, organizationId);
      const paid = sale.total > 0;
      const created = await tx.sale.create({
        data: {
          organizationId,
          number,
          ...sale,
          status: paid ? 'PAID' : 'CONFIRMED',
          paidTotal: sale.total,
          confirmedAt: new Date(),
          items: linesCreate(lines),
        },
        select: { id: true },
      });
      await takeStockForSale(
        tx,
        organizationId,
        created.id,
        lines.flatMap((l) => (l.catalogItemId ? [{ catalogItemId: l.catalogItemId, quantity: l.quantity }] : [])),
        userId,
      );
      if (paid) {
        const session = await tx.cashSession.findFirst({
          where: { organizationId, closedAt: null },
          select: { id: true },
        });
        await tx.payment.create({
          data: {
            saleId: created.id,
            cashSessionId: session?.id ?? null,
            method: payment.method,
            amount: sale.total,
            createdBy: userId,
          },
        });
      }
      return tx.sale.findUniqueOrThrow({ where: { id: created.id }, include: detailInclude });
    });
  }

  /**
   * Registers a payment only if the sale still has the status and paid amount that were read.
   * Links it to the open cash session, if any.
   */
  addPayment(p: {
    saleId: string;
    organizationId: string;
    expectedStatus: SaleStatus;
    expectedPaidTotal: number;
    newStatus: SaleStatus;
    amount: number;
    method: PaymentMethod;
    userId: string;
  }): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.sale.updateMany({
        where: { id: p.saleId, status: p.expectedStatus, paidTotal: p.expectedPaidTotal },
        data: { paidTotal: p.expectedPaidTotal + p.amount, status: p.newStatus },
      });
      if (count === 0) return false;
      const session = await tx.cashSession.findFirst({
        where: { organizationId: p.organizationId, closedAt: null },
        select: { id: true },
      });
      await tx.payment.create({
        data: {
          saleId: p.saleId,
          cashSessionId: session?.id ?? null,
          method: p.method,
          amount: p.amount,
          createdBy: p.userId,
        },
      });
      return true;
    });
  }

  // ── Reference checks (read-only access to other modules' tables, same org) ──

  async customerExists(id: string, organizationId: string) {
    return (await this.prisma.customer.count({ where: { id, organizationId } })) > 0;
  }

  async staffExists(id: string, organizationId: string) {
    return (await this.prisma.staffMember.count({ where: { id, organizationId } })) > 0;
  }

  findCatalogItems(ids: string[], organizationId: string) {
    return this.prisma.catalogItem.findMany({
      where: { id: { in: ids }, organizationId, isActive: true },
      select: { id: true, name: true, price: true, isVariantGroup: true },
    });
  }

  findAppointment(id: string, organizationId: string) {
    return this.prisma.appointment.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        title: true,
        status: true,
        customerId: true,
        staffId: true,
        service: { select: { id: true, name: true, price: true } },
      },
    });
  }

  async organizationTaxRate(organizationId: string): Promise<number> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { taxRateBps: true },
    });
    return org?.taxRateBps ?? 0;
  }
}
