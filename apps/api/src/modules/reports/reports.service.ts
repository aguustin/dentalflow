import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { DomainError } from '../../shared/contracts/errors/domain.error';

/** Statuses that count as real sales (drafts and voided ones don't). */
const LIVE_SALE = Prisma.sql`s."status" IN ('CONFIRMED', 'PARTIALLY_PAID', 'PAID')`;
const MAX_DAYS = 366;

interface Range {
  from: Date;
  to: Date;
  timezone: string;
}

const n = (v: unknown) => Number(v ?? 0);

/**
 * Read-only KPIs. Dates are days in the organization's time zone; sections appear only
 * for the modules the organization has enabled. All amounts in cents.
 */
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(organizationId: string, fromDay: string, toDay: string) {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { timezone: true, enabledModules: true, currency: true },
    });
    const range = toRange(fromDay, toDay, org.timezone);
    const has = (m: string) => org.enabledModules.includes(m);

    const [customers, sales, scheduling, inventory, workOrders] = await Promise.all([
      this.customers(organizationId, range),
      has('sales') ? this.sales(organizationId, range) : null,
      has('scheduling') ? this.scheduling(organizationId, range) : null,
      has('inventory') ? this.inventory(organizationId) : null,
      has('work_orders') ? this.workOrders(organizationId, range) : null,
    ]);
    return { from: fromDay, to: toDay, timezone: org.timezone, currency: org.currency, customers, sales, scheduling, inventory, workOrders };
  }

  /** Sales of the period as CSV (Excel-friendly for Spanish locales: ';' separator, decimal comma, BOM). */
  async salesCsv(organizationId: string, fromDay: string, toDay: string): Promise<string> {
    const { timezone } = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { timezone: true },
    });
    const range = toRange(fromDay, toDay, timezone);
    const rows = await this.prisma.sale.findMany({
      where: { organizationId, createdAt: { gte: range.from, lt: range.to }, status: { not: 'DRAFT' } },
      orderBy: { number: 'asc' },
      include: { customer: { select: { name: true } }, staff: { select: { name: true } } },
    });
    const money = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');
    const cell = (v: string | number | null | undefined) => {
      const s = String(v ?? '');
      return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      ['Nº', 'Fecha', 'Cliente', 'Vendedor/Profesional', 'Estado', 'Total', 'Cobrado', 'Reintegrado'],
      ...rows.map((s) => [
        s.number,
        DateTime.fromJSDate(s.createdAt, { zone: timezone }).toFormat('dd/MM/yyyy HH:mm'),
        s.customer?.name ?? '',
        s.staff?.name ?? '',
        STATUS_ES[s.status] ?? s.status,
        money(s.total),
        money(s.paidTotal),
        money(s.refundedTotal),
      ]),
    ];
    return '﻿' + lines.map((l) => l.map(cell).join(';')).join('\r\n') + '\r\n';
  }

  // ── Sections ───────────────────────────────────────────────────────────────

  private async customers(organizationId: string, r: Range) {
    const created = await this.prisma.customer.count({
      where: { organizationId, createdAt: { gte: r.from, lt: r.to } },
    });
    return { new: created };
  }

  private async sales(organizationId: string, r: Range) {
    const [[totals], [refunds], byMethod, byDay, topItems] = await Promise.all([
      this.prisma.$queryRaw<{ count: bigint; gross: bigint }[]>`
        SELECT COUNT(*) AS count, COALESCE(SUM(s."total"), 0) AS gross
        FROM "sales" s
        WHERE s."organization_id" = ${organizationId} AND ${LIVE_SALE}
          AND s."created_at" >= ${r.from} AND s."created_at" < ${r.to}`,
      this.prisma.$queryRaw<{ refunded: bigint }[]>`
        SELECT COALESCE(SUM(sr."refund_total"), 0) AS refunded
        FROM "sale_returns" sr
        WHERE sr."organization_id" = ${organizationId}
          AND sr."created_at" >= ${r.from} AND sr."created_at" < ${r.to}`,
      this.prisma.$queryRaw<{ method: string; amount: bigint }[]>`
        SELECT p."method", SUM(p."amount") AS amount
        FROM "payments" p JOIN "sales" s ON s."id" = p."sale_id"
        WHERE s."organization_id" = ${organizationId}
          AND p."created_at" >= ${r.from} AND p."created_at" < ${r.to}
        GROUP BY p."method"`,
      // Day in the organization's time zone (columns are UTC timestamps)
      this.prisma.$queryRaw<{ day: string; amount: bigint; count: bigint }[]>`
        SELECT to_char((s."created_at" AT TIME ZONE 'UTC') AT TIME ZONE ${r.timezone}, 'YYYY-MM-DD') AS day,
               SUM(s."total") AS amount, COUNT(*) AS count
        FROM "sales" s
        WHERE s."organization_id" = ${organizationId} AND ${LIVE_SALE}
          AND s."created_at" >= ${r.from} AND s."created_at" < ${r.to}
        GROUP BY 1 ORDER BY 1`,
      this.prisma.$queryRaw<{ description: string; quantity: bigint; revenue: bigint }[]>`
        SELECT MIN(si."description") AS description,
               SUM(si."quantity" - si."returned_quantity") AS quantity,
               SUM(si."total") AS revenue
        FROM "sale_items" si JOIN "sales" s ON s."id" = si."sale_id"
        WHERE s."organization_id" = ${organizationId} AND ${LIVE_SALE}
          AND s."created_at" >= ${r.from} AND s."created_at" < ${r.to}
        GROUP BY COALESCE(si."catalog_item_id", si."description")
        ORDER BY revenue DESC
        LIMIT 10`,
    ]);
    const count = n(totals.count);
    const gross = n(totals.gross);
    const refunded = n(refunds.refunded);
    return {
      count,
      gross,
      refunded,
      net: gross - refunded,
      averageTicket: count ? Math.round(gross / count) : 0,
      collectedByMethod: Object.fromEntries(byMethod.map((m) => [m.method, n(m.amount)])),
      byDay: byDay.map((d) => ({ day: d.day, amount: n(d.amount), count: n(d.count) })),
      topItems: topItems.map((t) => ({ description: t.description, quantity: n(t.quantity), revenue: n(t.revenue) })),
    };
  }

  private async scheduling(organizationId: string, r: Range) {
    const [byStatus, byStaff] = await Promise.all([
      this.prisma.appointment.groupBy({
        by: ['status'],
        where: { organizationId, startTime: { gte: r.from, lt: r.to } },
        _count: true,
      }),
      this.prisma.$queryRaw<{ name: string; completed: bigint; total: bigint }[]>`
        SELECT st."name", COUNT(*) FILTER (WHERE a."status" = 'COMPLETED') AS completed, COUNT(*) AS total
        FROM "appointments" a JOIN "staff_members" st ON st."id" = a."staff_id"
        WHERE a."organization_id" = ${organizationId}
          AND a."start_time" >= ${r.from} AND a."start_time" < ${r.to}
          AND a."status" <> 'CANCELLED'
        GROUP BY st."name" ORDER BY completed DESC`,
    ]);
    const count = (s: string) => byStatus.find((b) => b.status === s)?._count ?? 0;
    const attendedOrMissed = count('COMPLETED') + count('NO_SHOW');
    return {
      total: byStatus.reduce((sum, b) => sum + b._count, 0),
      byStatus: Object.fromEntries(byStatus.map((b) => [b.status, b._count])),
      /** Share of patients who didn't show up, among appointments that reached their time */
      noShowRate: attendedOrMissed ? count('NO_SHOW') / attendedOrMissed : 0,
      byStaff: byStaff.map((s) => ({ name: s.name, completed: n(s.completed), total: n(s.total) })),
    };
  }

  /** Current snapshot (not period-based). Valued at sale price: there is no cost price yet. */
  private async inventory(organizationId: string) {
    const [row] = await this.prisma.$queryRaw<{ units: bigint; value: bigint; reserved: bigint; low: bigint }[]>`
      SELECT COALESCE(SUM("stock_quantity"), 0) AS units,
             COALESCE(SUM("stock_quantity"::bigint * "price"), 0) AS value,
             COALESCE(SUM("reserved_quantity"), 0) AS reserved,
             COUNT(*) FILTER (WHERE "min_stock" IS NOT NULL AND "stock_quantity" - "reserved_quantity" <= "min_stock") AS low
      FROM "catalog_items"
      WHERE "organization_id" = ${organizationId} AND "track_stock" AND "is_active"`;
    return { units: n(row.units), valueAtSalePrice: n(row.value), reservedUnits: n(row.reserved), lowStock: n(row.low) };
  }

  private async workOrders(organizationId: string, r: Range) {
    const [open, [period]] = await Promise.all([
      this.prisma.workOrder.groupBy({
        by: ['status'],
        where: { organizationId, status: { notIn: ['DELIVERED', 'CANCELLED', 'REJECTED'] } },
        _count: true,
      }),
      this.prisma.$queryRaw<{ created: bigint; delivered: bigint; avg_hours: number | null; rejected: bigint }[]>`
        SELECT
          (SELECT COUNT(*) FROM "work_orders" w
             WHERE w."organization_id" = ${organizationId} AND w."created_at" >= ${r.from} AND w."created_at" < ${r.to}) AS created,
          COUNT(*) FILTER (WHERE e."to_status" = 'DELIVERED') AS delivered,
          AVG(EXTRACT(EPOCH FROM (e."created_at" - w."created_at")) / 3600)
            FILTER (WHERE e."to_status" = 'DELIVERED' AND w."sale_id" IS NOT NULL) AS avg_hours,
          COUNT(*) FILTER (WHERE e."to_status" = 'REJECTED') AS rejected
        FROM "work_order_events" e JOIN "work_orders" w ON w."id" = e."work_order_id"
        WHERE w."organization_id" = ${organizationId}
          AND e."created_at" >= ${r.from} AND e."created_at" < ${r.to}`,
    ]);
    return {
      openByStatus: Object.fromEntries(open.map((o) => [o.status, o._count])),
      created: n(period.created),
      delivered: n(period.delivered),
      rejected: n(period.rejected),
      /** Intake → delivery, for repaired (billed) orders delivered in the period */
      averageRepairHours: period.avg_hours === null ? null : Math.round(Number(period.avg_hours) * 10) / 10,
    };
  }
}

const STATUS_ES: Record<string, string> = {
  CONFIRMED: 'Pendiente de pago',
  PARTIALLY_PAID: 'Pago parcial',
  PAID: 'Pagada',
  VOIDED: 'Anulada',
};

/** [from 00:00, day after "to" 00:00) in the organization's zone, as UTC instants. */
function toRange(fromDay: string, toDay: string, timezone: string): Range {
  const from = DateTime.fromISO(fromDay, { zone: timezone }).startOf('day');
  const to = DateTime.fromISO(toDay, { zone: timezone }).plus({ days: 1 }).startOf('day');
  if (!from.isValid || !to.isValid) throw new DomainError('INVALID', 'from/to must be valid YYYY-MM-DD dates');
  if (to <= from) throw new DomainError('INVALID', "'to' must not be before 'from'");
  if (to.diff(from, 'days').days > MAX_DAYS) throw new DomainError('INVALID', `The range can't exceed ${MAX_DAYS} days`);
  return { from: from.toUTC().toJSDate(), to: to.toUTC().toJSDate(), timezone };
}
