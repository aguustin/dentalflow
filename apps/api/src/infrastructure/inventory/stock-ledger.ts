import { Prisma, StockMovementType } from '@prisma/client';
import { DomainError } from '../../shared/contracts/errors/domain.error';

/**
 * Stock ledger primitives, shared infrastructure used by the inventory and sales modules.
 *
 * Every function runs inside the caller's transaction (`tx`) so stock changes commit or roll
 * back together with the business operation (e.g. confirming a sale). Stock only changes here,
 * and every change is recorded as a StockMovement with the resulting balance.
 *
 * Concurrency: decrements are conditional atomic updates (`stock >= qty`); rows are touched in
 * a stable order (by id) so concurrent sales can't deadlock. A CHECK constraint (stock >= 0)
 * is the final safety net.
 */

type Tx = Prisma.TransactionClient;

export interface StockLine {
  catalogItemId: string;
  quantity: number;
}

export interface Shortage {
  catalogItemId: string;
  name: string;
  available: number;
  requested: number;
}

/** Sums quantities per item and returns them sorted by id (stable lock order). */
function aggregate(lines: StockLine[]): StockLine[] {
  const totals = new Map<string, number>();
  for (const l of lines) totals.set(l.catalogItemId, (totals.get(l.catalogItemId) ?? 0) + l.quantity);
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([catalogItemId, quantity]) => ({ catalogItemId, quantity }));
}

/**
 * Takes stock for a confirmed sale. Only items with trackStock are affected.
 * Throws DomainError CONFLICT listing every shortage (the transaction must roll back).
 */
export async function takeStockForSale(
  tx: Tx,
  organizationId: string,
  saleId: string,
  lines: StockLine[],
  userId?: string,
): Promise<void> {
  const shortages: Shortage[] = [];

  for (const line of aggregate(lines)) {
    const updated = await tx.$queryRaw<{ stock_quantity: number }[]>`
      UPDATE "catalog_items" SET "stock_quantity" = "stock_quantity" - ${line.quantity}
      WHERE "id" = ${line.catalogItemId} AND "organization_id" = ${organizationId}
        AND "track_stock" = true AND "stock_quantity" >= ${line.quantity}
      RETURNING "stock_quantity"`;

    if (updated.length === 1) {
      await tx.stockMovement.create({
        data: {
          organizationId,
          catalogItemId: line.catalogItemId,
          type: StockMovementType.SALE,
          quantity: -line.quantity,
          balanceAfter: updated[0].stock_quantity,
          saleId,
          createdBy: userId ?? null,
        },
      });
      continue;
    }

    // Not updated: either the item doesn't track stock (fine) or there isn't enough.
    const item = await tx.catalogItem.findFirst({
      where: { id: line.catalogItemId, organizationId },
      select: { name: true, trackStock: true, stockQuantity: true },
    });
    if (item?.trackStock) {
      shortages.push({
        catalogItemId: line.catalogItemId,
        name: item.name,
        available: item.stockQuantity,
        requested: line.quantity,
      });
    }
  }

  if (shortages.length > 0) {
    const list = shortages.map((s) => `${s.name} (available ${s.available}, requested ${s.requested})`);
    throw new DomainError('CONFLICT', `Insufficient stock: ${list.join('; ')}`, { shortages });
  }
}

/** Gives back exactly what a sale took, based on its SALE movements (idempotent per sale). */
export async function restoreStockForSale(
  tx: Tx,
  organizationId: string,
  saleId: string,
  userId?: string,
): Promise<void> {
  const taken = await tx.stockMovement.groupBy({
    by: ['catalogItemId'],
    where: { saleId, type: { in: [StockMovementType.SALE, StockMovementType.SALE_VOID] } },
    _sum: { quantity: true },
  });

  for (const t of [...taken].sort((a, b) => a.catalogItemId.localeCompare(b.catalogItemId))) {
    const outstanding = -(t._sum.quantity ?? 0); // SALE is negative, SALE_VOID positive
    if (outstanding <= 0) continue;
    const [row] = await tx.$queryRaw<{ stock_quantity: number }[]>`
      UPDATE "catalog_items" SET "stock_quantity" = "stock_quantity" + ${outstanding}
      WHERE "id" = ${t.catalogItemId} AND "organization_id" = ${organizationId}
      RETURNING "stock_quantity"`;
    if (!row) continue; // item deleted
    await tx.stockMovement.create({
      data: {
        organizationId,
        catalogItemId: t.catalogItemId,
        type: StockMovementType.SALE_VOID,
        quantity: outstanding,
        balanceAfter: row.stock_quantity,
        saleId,
        createdBy: userId ?? null,
      },
    });
  }
}

/** Purchase (+quantity) or physical count adjustment (sets the stock to `counted`). */
export async function recordStockChange(
  tx: Tx,
  organizationId: string,
  catalogItemId: string,
  change: { type: 'PURCHASE'; quantity: number } | { type: 'ADJUSTMENT'; counted: number },
  meta: { note?: string | null; userId?: string },
) {
  // Row lock: serializes concurrent changes to the same item
  const [current] = await tx.$queryRaw<{ stock_quantity: number; track_stock: boolean }[]>`
    SELECT "stock_quantity", "track_stock" FROM "catalog_items"
    WHERE "id" = ${catalogItemId} AND "organization_id" = ${organizationId}
    FOR UPDATE`;
  if (!current) throw new DomainError('NOT_FOUND', 'Product not found');
  if (!current.track_stock) throw new DomainError('INVALID', 'This product does not track stock');

  const balanceAfter =
    change.type === 'PURCHASE' ? current.stock_quantity + change.quantity : change.counted;
  const delta = balanceAfter - current.stock_quantity;
  if (change.type === 'ADJUSTMENT' && delta === 0) {
    throw new DomainError('INVALID', 'The counted quantity equals the current stock');
  }

  await tx.catalogItem.update({ where: { id: catalogItemId }, data: { stockQuantity: balanceAfter } });
  return tx.stockMovement.create({
    data: {
      organizationId,
      catalogItemId,
      type: change.type,
      quantity: delta,
      balanceAfter,
      note: meta.note?.trim() || null,
      createdBy: meta.userId ?? null,
    },
  });
}
