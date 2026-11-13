import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CatalogItemType, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { DomainError } from '../../shared/contracts/errors/domain.error';

export interface CatalogItemData {
  type: CatalogItemType;
  name: string;
  sku?: string | null;
  price: number;
  durationMinutes?: number | null;
  trackStock?: boolean;
  isActive?: boolean;
}

export interface CatalogQuery {
  type?: CatalogItemType;
  search?: string;
  includeInactive?: boolean;
  limit?: number;
  offset?: number;
}

const select = {
  id: true,
  type: true,
  name: true,
  sku: true,
  price: true,
  durationMinutes: true,
  trackStock: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CatalogItemSelect;

/**
 * Services and products sold by the organization. Plain CRUD: a single service talks
 * to Prisma directly (no domain logic beyond the type rules below).
 */
@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, q: CatalogQuery) {
    const limit = Math.min(q.limit ?? 50, 200);
    const offset = q.offset ?? 0;
    const where: Prisma.CatalogItemWhereInput = {
      organizationId,
      ...(q.type && { type: q.type }),
      ...(!q.includeInactive && { isActive: true }),
      ...(q.search && {
        OR: [
          { name: { contains: q.search, mode: 'insensitive' } },
          { sku: { contains: q.search, mode: 'insensitive' } },
        ],
      }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.catalogItem.findMany({ where, select, orderBy: { name: 'asc' }, take: limit, skip: offset }),
      this.prisma.catalogItem.count({ where }),
    ]);
    return { items, total, limit, offset };
  }

  async get(id: string, organizationId: string) {
    const item = await this.prisma.catalogItem.findFirst({ where: { id, organizationId }, select });
    if (!item) throw new NotFoundException('Catalog item not found');
    return item;
  }

  create(organizationId: string, data: CatalogItemData) {
    return this.prisma.catalogItem
      .create({ data: { organizationId, ...normalize(data) }, select })
      .catch(rethrowDuplicateSku);
  }

  async update(id: string, organizationId: string, data: Partial<CatalogItemData>) {
    const current = await this.get(id, organizationId);
    const merged = normalize({ ...current, ...data, type: current.type }); // type is immutable
    return this.prisma.catalogItem
      .update({ where: { id }, data: merged, select })
      .catch(rethrowDuplicateSku);
  }
}

/** Services have a duration and never track stock; products have no duration. */
function normalize(data: CatalogItemData) {
  if (!Number.isInteger(data.price) || data.price < 0) {
    throw new DomainError('INVALID', 'price must be a non-negative integer amount in cents');
  }
  const isService = data.type === CatalogItemType.SERVICE;
  return {
    type: data.type,
    name: data.name.trim(),
    sku: data.sku?.trim() || null,
    price: data.price,
    durationMinutes: isService ? (data.durationMinutes ?? null) : null,
    trackStock: isService ? false : (data.trackStock ?? false),
    isActive: data.isActive ?? true,
  };
}

function rethrowDuplicateSku(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    throw new ConflictException('Another item already uses that SKU');
  }
  throw err;
}
