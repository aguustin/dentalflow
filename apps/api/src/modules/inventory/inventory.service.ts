import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { recordStockChange } from '../../infrastructure/inventory/stock-ledger';

const productSelect = {
  id: true,
  name: true,
  sku: true,
  stockQuantity: true,
  minStock: true,
  isActive: true,
} satisfies Prisma.CatalogItemSelect;

type ProductRow = Prisma.CatalogItemGetPayload<{ select: typeof productSelect }>;

const withAlert = (p: ProductRow) => ({
  ...p,
  isLow: p.minStock !== null && p.stockQuantity <= p.minStock,
});

/** Stock of products with trackStock. All changes go through the shared stock ledger. */
@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, q: { search?: string; lowOnly?: boolean }) {
    const rows = await this.prisma.catalogItem.findMany({
      where: {
        organizationId,
        trackStock: true,
        isActive: true,
        ...(q.search && {
          OR: [
            { name: { contains: q.search, mode: 'insensitive' } },
            { sku: { contains: q.search, mode: 'insensitive' } },
          ],
        }),
      },
      select: productSelect,
      orderBy: { name: 'asc' },
    });
    const items = rows.map(withAlert);
    return q.lowOnly ? items.filter((i) => i.isLow) : items;
  }

  /** Count for the menu badge (column-to-column comparison needs raw SQL). */
  async lowStockCount(organizationId: string): Promise<{ count: number }> {
    const [row] = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM "catalog_items"
      WHERE "organization_id" = ${organizationId} AND "track_stock" AND "is_active"
        AND "min_stock" IS NOT NULL AND "stock_quantity" <= "min_stock"`;
    return { count: Number(row?.count ?? 0) };
  }

  async get(itemId: string, organizationId: string) {
    const product = await this.prisma.catalogItem.findFirst({
      where: { id: itemId, organizationId, trackStock: true },
      select: productSelect,
    });
    if (!product) throw new NotFoundException('Product with stock control not found');
    const movements = await this.prisma.stockMovement.findMany({
      where: { catalogItemId: itemId, organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        type: true,
        quantity: true,
        balanceAfter: true,
        note: true,
        createdAt: true,
        sale: { select: { id: true, number: true } },
      },
    });
    return { ...withAlert(product), movements };
  }

  async purchase(itemId: string, organizationId: string, userId: string, quantity: number, note?: string) {
    await this.prisma.$transaction((tx) =>
      recordStockChange(tx, organizationId, itemId, { type: 'PURCHASE', quantity }, { note, userId }),
    );
    return this.get(itemId, organizationId);
  }

  async adjust(itemId: string, organizationId: string, userId: string, counted: number, note?: string) {
    await this.prisma.$transaction((tx) =>
      recordStockChange(tx, organizationId, itemId, { type: 'ADJUSTMENT', counted }, { note, userId }),
    );
    return this.get(itemId, organizationId);
  }

  async setMinStock(itemId: string, organizationId: string, minStock: number | null) {
    const { count } = await this.prisma.catalogItem.updateMany({
      where: { id: itemId, organizationId, trackStock: true },
      data: { minStock },
    });
    if (count === 0) throw new NotFoundException('Product with stock control not found');
    return this.get(itemId, organizationId);
  }
}
