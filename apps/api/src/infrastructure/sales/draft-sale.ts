import { Prisma } from '@prisma/client';
import { computeSaleTotals } from '../../shared/sales/sale-totals';

/**
 * Sale-creation primitives shared by modules that create sales inside their own
 * transaction (e.g. billing a treatment plan atomically with marking its items).
 */

type Tx = Prisma.TransactionClient;

/** Next sequential sale number of the organization (atomic counter, no gaps or repeats). */
export async function nextSaleNumber(tx: Tx, organizationId: string): Promise<number> {
  const [{ sale_counter }] = await tx.$queryRaw<{ sale_counter: number }[]>`
    UPDATE "organizations" SET "sale_counter" = "sale_counter" + 1
    WHERE "id" = ${organizationId} RETURNING "sale_counter"`;
  return sale_counter;
}

export interface DraftSaleLine {
  catalogItemId: string | null;
  description: string;
  quantity: number;
  /** cents */
  unitPrice: number;
  /** cents, whole line */
  discount?: number;
}

/** Creates a DRAFT sale with the organization's tax rate. Returns its id and number. */
export async function createDraftSale(
  tx: Tx,
  organizationId: string,
  input: { customerId: string | null; staffId?: string | null; notes?: string | null; lines: DraftSaleLine[] },
): Promise<{ id: string; number: number }> {
  const { taxRateBps } = await tx.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { taxRateBps: true },
  });
  const totals = computeSaleTotals(input.lines, 0, taxRateBps);
  const number = await nextSaleNumber(tx, organizationId);

  return tx.sale.create({
    data: {
      organizationId,
      number,
      customerId: input.customerId,
      staffId: input.staffId ?? null,
      notes: input.notes ?? null,
      taxRateBps,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      items: {
        create: input.lines.map((l, position) => ({
          catalogItemId: l.catalogItemId,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discount: l.discount ?? 0,
          total: totals.lines[position].total,
          position,
        })),
      },
    },
    select: { id: true, number: true },
  });
}
