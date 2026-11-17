import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { DomainError } from '../../shared/contracts/errors/domain.error';
import { getVertical, validateAttributes } from '../../shared/verticals';

const select = {
  id: true,
  customerId: true,
  label: true,
  attributes: true,
  isActive: true,
  createdAt: true,
  customer: { select: { name: true } },
} satisfies Prisma.AssetSelect;

type AssetRow = Prisma.AssetGetPayload<{ select: typeof select }>;

const toDto = ({ customer, ...a }: AssetRow) => ({ ...a, customerName: customer.name });

/** Customer equipment (vehicles, devices…). Attribute schema comes from the vertical template. */
@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, q: { customerId?: string; search?: string }) {
    const rows = await this.prisma.asset.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(q.customerId && { customerId: q.customerId }),
        ...(q.search && { label: { contains: q.search, mode: 'insensitive' } }),
      },
      orderBy: { label: 'asc' },
      take: 100,
      select,
    });
    return rows.map(toDto);
  }

  async get(id: string, organizationId: string) {
    const asset = await this.prisma.asset.findFirst({ where: { id, organizationId }, select });
    if (!asset) throw new NotFoundException('Asset not found');
    const workOrders = await this.prisma.workOrder.findMany({
      where: { assetId: id, organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, number: true, status: true, reportedIssue: true, createdAt: true },
    });
    return { ...toDto(asset), workOrders };
  }

  async create(organizationId: string, input: { customerId: string; label: string; attributes?: unknown }) {
    const customer = await this.prisma.customer.count({ where: { id: input.customerId, organizationId } });
    if (!customer) throw new NotFoundException('Customer not found');
    const attributes = await this.validate(organizationId, input.attributes);
    const asset = await this.prisma.asset.create({
      data: { organizationId, customerId: input.customerId, label: input.label.trim(), attributes },
      select,
    });
    return toDto(asset);
  }

  async update(
    id: string,
    organizationId: string,
    input: { label?: string; attributes?: unknown; isActive?: boolean },
  ) {
    const exists = await this.prisma.asset.count({ where: { id, organizationId } });
    if (!exists) throw new NotFoundException('Asset not found');
    const asset = await this.prisma.asset.update({
      where: { id },
      data: {
        ...(input.label !== undefined && { label: input.label.trim() }),
        ...(input.attributes !== undefined && { attributes: await this.validate(organizationId, input.attributes) }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
      select,
    });
    return toDto(asset);
  }

  private async validate(organizationId: string, input: unknown): Promise<Prisma.InputJsonObject> {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { vertical: true },
    });
    const fields = getVertical(org.vertical).assetAttributes;
    if (!fields) throw new DomainError('INVALID', 'This business vertical has no equipment fields');
    return validateAttributes(fields, input) as Prisma.InputJsonObject;
  }
}
