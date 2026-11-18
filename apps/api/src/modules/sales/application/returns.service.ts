import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { returnStockForSale } from '../../../infrastructure/inventory/stock-ledger';
import { DomainError } from '../../../shared/contracts/errors/domain.error';
import { allocateSaleTotal, refundAmount } from '../domain/refund-rules';

export interface ReturnInput {
  items: { saleItemId: string; quantity: number; serials?: string[] }[];
  refundMethod: PaymentMethod;
  reason?: string;
}

const CHANGED = 'The sale was modified by someone else (another return?). Reload and try again.';

/**
 * Returns of paid sales: units go back to stock (the exact variant), money goes back to the
 * customer (recorded in the open cash session), serials are released.
 */
@Injectable()
export class ReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(saleId: string, organizationId: string, userId: string, input: ReturnInput) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, organizationId },
      include: {
        items: {
          orderBy: { position: 'asc' },
          include: { serials: { where: { returnedAt: null }, select: { id: true, serial: true } } },
        },
      },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    if (sale.status !== 'PAID') {
      throw new DomainError('CONFLICT', 'Only fully paid sales can have returns');
    }
    if (input.items.length === 0) throw new DomainError('INVALID', 'Choose at least one unit to return');
    if (new Set(input.items.map((i) => i.saleItemId)).size !== input.items.length) {
      throw new DomainError('INVALID', 'Each sale line can appear only once');
    }

    // What the customer actually paid per line (global discount and tax spread over lines)
    const shares = allocateSaleTotal(
      sale.items.map((i) => i.total),
      sale.total,
    );

    const plan = input.items.map((req) => {
      const index = sale.items.findIndex((i) => i.id === req.saleItemId);
      if (index < 0) throw new NotFoundException('Sale line not found');
      const item = sale.items[index];
      const amount = refundAmount(
        { share: shares[index], quantity: item.quantity, returnedQuantity: item.returnedQuantity },
        req.quantity,
      );
      // Serialized units: say which ones come back
      let serialIds: string[] = [];
      if (item.serials.length > 0) {
        const wanted = [...new Set((req.serials ?? []).map((s) => s.trim()))];
        if (wanted.length !== req.quantity) {
          throw new DomainError('INVALID', `'${item.description}': list the ${req.quantity} serial number(s) returned`);
        }
        serialIds = wanted.map((serial) => {
          const found = item.serials.find((s) => s.serial === serial);
          if (!found) throw new DomainError('INVALID', `Serial '${serial}' was not sold in this line`);
          return found.id;
        });
      }
      return { item, quantity: req.quantity, amount, serialIds };
    });
    const refundTotal = plan.reduce((sum, p) => sum + p.amount, 0);

    await this.prisma.$transaction(async (tx) => {
      // Optimistic guards: lines and sale must still be as read (concurrent returns lose)
      for (const p of plan) {
        const { count } = await tx.saleItem.updateMany({
          where: { id: p.item.id, returnedQuantity: p.item.returnedQuantity },
          data: { returnedQuantity: p.item.returnedQuantity + p.quantity },
        });
        if (count === 0) throw new DomainError('CONFLICT', CHANGED);
      }
      const { count } = await tx.sale.updateMany({
        where: { id: saleId, refundedTotal: sale.refundedTotal },
        data: { refundedTotal: sale.refundedTotal + refundTotal },
      });
      if (count === 0) throw new DomainError('CONFLICT', CHANGED);

      const session = await tx.cashSession.findFirst({
        where: { organizationId, closedAt: null },
        select: { id: true },
      });
      await tx.saleReturn.create({
        data: {
          organizationId,
          saleId,
          reason: input.reason?.trim() || null,
          refundTotal,
          refundMethod: input.refundMethod,
          cashSessionId: session?.id ?? null,
          createdBy: userId,
          items: { create: plan.map((p) => ({ saleItemId: p.item.id, quantity: p.quantity, amount: p.amount })) },
        },
      });

      for (const p of plan) {
        if (p.item.catalogItemId) {
          await returnStockForSale(tx, organizationId, saleId, p.item.catalogItemId, p.quantity, userId);
        }
        if (p.serialIds.length > 0) {
          await tx.saleItemSerial.updateMany({
            where: { id: { in: p.serialIds }, returnedAt: null },
            data: { returnedAt: new Date() },
          });
        }
      }
    });
    return { refundTotal };
  }

  /** Who bought this unit, when, and whether it is still under warranty. */
  async findSerial(organizationId: string, serial: string) {
    const rows = await this.prisma.saleItemSerial.findMany({
      where: { organizationId, serial: serial.trim() },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        saleItem: {
          select: {
            description: true,
            sale: { select: { id: true, number: true, createdAt: true, customer: { select: { id: true, name: true } } } },
          },
        },
      },
    });
    if (rows.length === 0) throw new NotFoundException(`Serial '${serial}' not found`);
    const now = new Date();
    return rows.map((r) => ({
      serial: r.serial,
      product: r.saleItem.description,
      sale: { id: r.saleItem.sale.id, number: r.saleItem.sale.number, date: r.saleItem.sale.createdAt },
      customer: r.saleItem.sale.customer,
      warrantyUntil: r.warrantyUntil,
      inWarranty: !!r.warrantyUntil && r.warrantyUntil > now && !r.returnedAt,
      returnedAt: r.returnedAt,
    }));
  }
}
