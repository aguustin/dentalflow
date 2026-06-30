import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MembershipEntity } from '../../domain/entities/membership.entity';
import {
  CreateMembershipData,
  IMembershipRepository,
} from '../../domain/repositories/membership.repository.interface';

@Injectable()
export class MembershipPrismaRepository implements IMembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserAndOrganization(
    userId: string,
    organizationId: string,
  ): Promise<MembershipEntity | null> {
    const row = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    return row ? this.toEntity(row) : null;
  }

  async findAllByUser(userId: string): Promise<MembershipEntity[]> {
    const rows = await this.prisma.membership.findMany({ where: { userId } });
    return rows.map(this.toEntity);
  }

  async findAllByOrganization(organizationId: string): Promise<MembershipEntity[]> {
    const rows = await this.prisma.membership.findMany({ where: { organizationId } });
    return rows.map(this.toEntity);
  }

  async create(data: CreateMembershipData): Promise<MembershipEntity> {
    const row = await this.prisma.membership.create({
      data: {
        id: data.id,
        userId: data.userId,
        organizationId: data.organizationId,
        roleId: data.roleId,
      },
    });
    return this.toEntity(row);
  }

  async updateRole(membershipId: string, roleId: string): Promise<MembershipEntity> {
    const row = await this.prisma.membership.update({
      where: { id: membershipId },
      data: { roleId },
    });
    return this.toEntity(row);
  }

  async existsByUserAndOrganization(userId: string, organizationId: string): Promise<boolean> {
    const count = await this.prisma.membership.count({
      where: { userId, organizationId },
    });
    return count > 0;
  }

  private toEntity(row: {
    id: string;
    userId: string;
    organizationId: string;
    roleId: string;
    isActive: boolean;
    joinedAt: Date;
  }): MembershipEntity {
    return MembershipEntity.create({
      id: row.id,
      userId: row.userId,
      organizationId: row.organizationId,
      roleId: row.roleId,
      isActive: row.isActive,
      joinedAt: row.joinedAt,
    });
  }
}
