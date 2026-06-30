import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RoleEntity } from '../../domain/entities/role.entity';
import {
  CreateRoleData,
  IRoleRepository,
} from '../../domain/repositories/role.repository.interface';

@Injectable()
export class RolePrismaRepository implements IRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<RoleEntity | null> {
    const row = await this.prisma.role.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async findByNameAndOrganization(
    name: string,
    organizationId: string,
  ): Promise<RoleEntity | null> {
    const row = await this.prisma.role.findUnique({
      where: { name_organizationId: { name, organizationId } },
    });
    return row ? this.toEntity(row) : null;
  }

  async findAllByOrganization(organizationId: string): Promise<RoleEntity[]> {
    const rows = await this.prisma.role.findMany({ where: { organizationId } });
    return rows.map(this.toEntity);
  }

  async create(data: CreateRoleData): Promise<RoleEntity> {
    const row = await this.prisma.role.create({
      data: {
        id: data.id,
        name: data.name,
        organizationId: data.organizationId,
      },
    });
    return this.toEntity(row);
  }

  async existsByNameAndOrganization(name: string, organizationId: string): Promise<boolean> {
    const count = await this.prisma.role.count({ where: { name, organizationId } });
    return count > 0;
  }

  private toEntity(row: { id: string; name: string; organizationId: string; createdAt: Date }): RoleEntity {
    return RoleEntity.create({
      id: row.id,
      name: row.name,
      organizationId: row.organizationId,
      createdAt: row.createdAt,
    });
  }
}
