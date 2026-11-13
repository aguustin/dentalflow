import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { OrganizationEntity } from '../../domain/entities/organization.entity';
import {
  CreateOrganizationData,
  IOrganizationRepository,
} from '../../domain/repositories/organization.repository.interface';

@Injectable()
export class OrganizationPrismaRepository implements IOrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<OrganizationEntity | null> {
    const row = await this.prisma.organization.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async findBySlug(slug: string): Promise<OrganizationEntity | null> {
    const row = await this.prisma.organization.findUnique({ where: { slug } });
    return row ? this.toEntity(row) : null;
  }

  async create(data: CreateOrganizationData): Promise<OrganizationEntity> {
    const row = await this.prisma.organization.create({
      data: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        vertical: data.vertical,
        enabledModules: data.enabledModules,
        ...(data.timezone && { timezone: data.timezone }),
      },
    });
    return this.toEntity(row);
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const count = await this.prisma.organization.count({ where: { slug } });
    return count > 0;
  }

  private toEntity(row: {
    id: string;
    name: string;
    slug: string;
    vertical: string;
    enabledModules: string[];
    timezone: string;
    currency: string;
    taxRateBps: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): OrganizationEntity {
    return OrganizationEntity.create({
      id: row.id,
      name: row.name,
      slug: row.slug,
      vertical: row.vertical,
      enabledModules: row.enabledModules,
      timezone: row.timezone,
      currency: row.currency,
      taxRateBps: row.taxRateBps,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
