import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CatalogItemType, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { DomainError } from '../../shared/contracts/errors/domain.error';
import { getVertical, validateAttributes } from '../../shared/verticals';
import { planVariants, VariantAxis, VariantOptions } from './domain/variants';

export interface CatalogItemData {
  type: CatalogItemType;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  price: number;
  durationMinutes?: number | null;
  trackStock?: boolean;
  isActive?: boolean;
  /** Products only: becomes a container of variants (not sold, no stock) */
  isVariantGroup?: boolean;
  attributes?: Record<string, unknown>;
}

export interface CatalogQuery {
  type?: CatalogItemType;
  search?: string;
  includeInactive?: boolean;
  /**
   * false (catalog screen): standalone items and variant groups, without the variants.
   * true (pickers, POS): what can be sold — standalone items and variants, without groups.
   */
  sellable?: boolean;
  limit?: number;
  offset?: number;
}

const select = {
  id: true,
  type: true,
  name: true,
  sku: true,
  barcode: true,
  price: true,
  durationMinutes: true,
  trackStock: true,
  stockQuantity: true,
  reservedQuantity: true,
  isVariantGroup: true,
  parentId: true,
  variantOptions: true,
  attributes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CatalogItemSelect;

/**
 * Services and products sold by the organization, including variant groups and their
 * variants (each variant is a regular catalog item with its own SKU, price and stock).
 */
@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, q: CatalogQuery) {
    const limit = Math.min(q.limit ?? 50, 200);
    const offset = q.offset ?? 0;
    const where: Prisma.CatalogItemWhereInput = {
      organizationId,
      ...(q.sellable ? { isVariantGroup: false } : { parentId: null }),
      ...(q.type && { type: q.type }),
      ...(!q.includeInactive && { isActive: true }),
      ...(q.search && {
        OR: [
          { name: { contains: q.search, mode: 'insensitive' } },
          { sku: { contains: q.search, mode: 'insensitive' } },
          { barcode: q.search },
        ],
      }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.catalogItem.findMany({ where, select, orderBy: { name: 'asc' }, take: limit, skip: offset }),
      this.prisma.catalogItem.count({ where }),
    ]);
    return { items, total, limit, offset };
  }

  /** Exact match by barcode or SKU among sellable items (barcode scanner / POS). */
  async lookup(organizationId: string, code: string) {
    const item = await this.prisma.catalogItem.findFirst({
      where: {
        organizationId,
        isActive: true,
        isVariantGroup: false,
        OR: [{ barcode: code }, { sku: { equals: code, mode: 'insensitive' } }],
      },
      select,
    });
    if (!item) throw new NotFoundException(`No product with code '${code}'`);
    return item;
  }

  async get(id: string, organizationId: string) {
    const item = await this.prisma.catalogItem.findFirst({ where: { id, organizationId }, select });
    if (!item) throw new NotFoundException('Catalog item not found');
    const variants = item.isVariantGroup
      ? await this.prisma.catalogItem.findMany({
          where: { parentId: id, organizationId },
          select,
          orderBy: { name: 'asc' },
        })
      : [];
    return { ...item, variants };
  }

  async create(organizationId: string, data: CatalogItemData) {
    const attributes = await this.validateAttributes(organizationId, data.attributes);
    return this.prisma.catalogItem
      .create({ data: { organizationId, ...normalize(data), attributes }, select })
      .catch(rethrowDuplicate);
  }

  async update(id: string, organizationId: string, data: Partial<CatalogItemData>) {
    const current = await this.prisma.catalogItem.findFirst({ where: { id, organizationId }, select });
    if (!current) throw new NotFoundException('Catalog item not found');
    const merged = normalize({
      ...current,
      attributes: undefined, // validated separately below
      ...data,
      type: current.type, // immutable
      isVariantGroup: current.isVariantGroup, // immutable
    });
    if (current.parentId) merged.isVariantGroup = false;
    const attributes =
      data.attributes !== undefined ? await this.validateAttributes(organizationId, data.attributes) : undefined;
    return this.prisma.catalogItem
      .update({ where: { id }, data: { ...merged, ...(attributes && { attributes }) }, select })
      .catch(rethrowDuplicate);
  }

  /**
   * Creates the missing variants of a group for every combination of the axes.
   * Variants inherit price, type and stock control; each can be edited afterwards.
   */
  async generateVariants(
    groupId: string,
    organizationId: string,
    input: { axes: VariantAxis[]; price?: number; trackStock?: boolean },
  ) {
    const group = await this.prisma.catalogItem.findFirst({ where: { id: groupId, organizationId }, select });
    if (!group) throw new NotFoundException('Catalog item not found');
    if (!group.isVariantGroup) throw new DomainError('INVALID', 'This product is not a variant group');

    const existing = await this.prisma.catalogItem.findMany({
      where: { parentId: groupId },
      select: { variantOptions: true },
    });
    const plan = planVariants(
      { name: group.name, skuPrefix: group.sku },
      input.axes,
      existing.map((e) => (e.variantOptions ?? {}) as VariantOptions),
    );

    await this.prisma.$transaction(
      plan.map((v) =>
        this.prisma.catalogItem.create({
          data: {
            organizationId,
            type: group.type,
            parentId: groupId,
            name: v.name,
            sku: v.sku,
            variantOptions: v.options,
            price: input.price ?? group.price,
            trackStock: input.trackStock ?? true,
            attributes: (group.attributes ?? {}) as Prisma.InputJsonObject,
          },
        }),
      ),
    ).catch(rethrowDuplicate);
    return { created: plan.length, group: await this.get(groupId, organizationId) };
  }

  private async validateAttributes(organizationId: string, input: unknown): Promise<Prisma.InputJsonObject> {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { vertical: true },
    });
    const fields = getVertical(org.vertical).productAttributes ?? [];
    return validateAttributes(fields, input ?? {}) as Prisma.InputJsonObject;
  }
}

/** Services have a duration and never track stock; products have no duration; groups hold no stock. */
function normalize(data: CatalogItemData) {
  if (!Number.isInteger(data.price) || data.price < 0) {
    throw new DomainError('INVALID', 'price must be a non-negative integer amount in cents');
  }
  const isService = data.type === CatalogItemType.SERVICE;
  if (isService && data.isVariantGroup) throw new DomainError('INVALID', 'Only products can have variants');
  const isGroup = !!data.isVariantGroup;
  return {
    type: data.type,
    name: data.name.trim(),
    sku: data.sku?.trim() || null,
    barcode: data.barcode?.trim() || null,
    price: data.price,
    durationMinutes: isService ? (data.durationMinutes ?? null) : null,
    trackStock: isService || isGroup ? false : (data.trackStock ?? false),
    isVariantGroup: isGroup,
    isActive: data.isActive ?? true,
  };
}

function rethrowDuplicate(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const target = String((err.meta as { target?: unknown })?.target ?? '');
    throw new ConflictException(
      target.includes('barcode') ? 'Another item already uses that barcode' : 'Another item already uses that SKU',
    );
  }
  throw err;
}
