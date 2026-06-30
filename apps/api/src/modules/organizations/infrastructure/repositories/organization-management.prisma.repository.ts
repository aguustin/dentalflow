import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  IOrganizationManagementRepository,
  UpdateOrganizationData,
} from '../../domain/repositories/organization-management.repository.interface';

@Injectable()
export class OrganizationManagementPrismaRepository implements IOrganizationManagementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async update(
    id: string,
    data: UpdateOrganizationData,
  ): Promise<{ id: string; name: string; slug: string; isActive: boolean; updatedAt: Date }> {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData['name'] = data.name;
    if (data.slug !== undefined) updateData['slug'] = data.slug;

    const row = await this.prisma.organization.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, slug: true, isActive: true, updatedAt: true },
    });

    return row;
  }
}
