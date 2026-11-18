import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

type Totals = Record<PaymentMethod, number>;
const emptyTotals = (): Totals => ({ CASH: 0, CARD: 0, TRANSFER: 0, OTHER: 0 });

/**
 * Daily cash register: open with an initial amount, payments registered while open are
 * attached to it, close with the counted cash to see the difference against the expected.
 */
@Injectable()
export class CashService {
  constructor(private readonly prisma: PrismaService) {}

  async current(organizationId: string) {
    const session = await this.prisma.cashSession.findFirst({ where: { organizationId, closedAt: null } });
    return session ? this.withSummary(session) : null;
  }

  async open(organizationId: string, userId: string, openingAmount: number) {
    const session = await this.prisma.cashSession
      .create({ data: { organizationId, openedBy: userId, openingAmount } })
      .catch((err: unknown) => {
        // cash_sessions_one_open_per_org (partial unique index)
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new ConflictException('There is already an open cash session');
        }
        throw err;
      });
    return this.withSummary(session);
  }

  async close(organizationId: string, userId: string, countedCash: number, notes?: string) {
    const session = await this.prisma.cashSession.findFirst({ where: { organizationId, closedAt: null } });
    if (!session) throw new NotFoundException('There is no open cash session');
    const { byMethod, refundsByMethod } = await this.summarize(session.id);
    const expectedCash = session.openingAmount + byMethod.CASH - refundsByMethod.CASH;

    const { count } = await this.prisma.cashSession.updateMany({
      where: { id: session.id, closedAt: null },
      data: { closedAt: new Date(), closedBy: userId, countedCash, expectedCash, notes: notes?.trim() || null },
    });
    if (count === 0) throw new ConflictException('The cash session was already closed');
    const closed = await this.prisma.cashSession.findUniqueOrThrow({ where: { id: session.id } });
    return this.withSummary(closed);
  }

  async history(organizationId: string, limit = 20) {
    const sessions = await this.prisma.cashSession.findMany({
      where: { organizationId, closedAt: { not: null } },
      orderBy: { openedAt: 'desc' },
      take: Math.min(limit, 100),
    });
    return Promise.all(sessions.map((s) => this.withSummary(s)));
  }

  private async summarize(sessionId: string) {
    const groups = await this.prisma.payment.groupBy({
      by: ['method'],
      where: { cashSessionId: sessionId },
      _sum: { amount: true },
      _count: true,
    });
    const byMethod = emptyTotals();
    let paymentCount = 0;
    for (const g of groups) {
      byMethod[g.method] = g._sum.amount ?? 0;
      paymentCount += g._count;
    }
    const refundGroups = await this.prisma.saleReturn.groupBy({
      by: ['refundMethod'],
      where: { cashSessionId: sessionId },
      _sum: { refundTotal: true },
    });
    const refundsByMethod = emptyTotals();
    for (const g of refundGroups) refundsByMethod[g.refundMethod] = g._sum.refundTotal ?? 0;
    return { byMethod, refundsByMethod, paymentCount };
  }

  private async withSummary(session: {
    id: string;
    openedAt: Date;
    openingAmount: number;
    closedAt: Date | null;
    countedCash: number | null;
    expectedCash: number | null;
    notes: string | null;
  }) {
    const { byMethod, refundsByMethod, paymentCount } = await this.summarize(session.id);
    const expectedCash = session.expectedCash ?? session.openingAmount + byMethod.CASH - refundsByMethod.CASH;
    const sum = (t: Record<string, number>) => Object.values(t).reduce((a, b) => a + b, 0);
    return {
      id: session.id,
      openedAt: session.openedAt,
      openingAmount: session.openingAmount,
      closedAt: session.closedAt,
      byMethod,
      refundsByMethod,
      paymentCount,
      /** Net of refunds */
      totalCollected: sum(byMethod) - sum(refundsByMethod),
      expectedCash,
      countedCash: session.countedCash,
      difference: session.countedCash === null ? null : session.countedCash - expectedCash,
      notes: session.notes,
    };
  }
}
