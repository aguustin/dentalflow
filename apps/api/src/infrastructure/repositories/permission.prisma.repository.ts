import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PermissionEntity } from '../../domain/entities/permission.entity';
import {
  CreatePermissionData,
  IPermissionRepository,
} from '../../domain/repositories/permission.repository.interface';

@Injectable()
export class PermissionPrismaRepository implements IPermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PermissionEntity | null> {
    const row = await this.prisma.permission.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async findByKey(resource: string, action: string): Promise<PermissionEntity | null> {
    const row = await this.prisma.permission.findUnique({
      where: { resource_action: { resource, action } },
    });
    return row ? this.toEntity(row) : null;
  }

  async findByRoleId(roleId: string): Promise<PermissionEntity[]> {
    const rows = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });
    return rows.map((r) => this.toEntity(r.permission));
  }

  async findAll(): Promise<PermissionEntity[]> {
    const rows = await this.prisma.permission.findMany();
    return rows.map(this.toEntity);
  }

  async create(data: CreatePermissionData): Promise<PermissionEntity> {
    const row = await this.prisma.permission.create({
      data: { id: data.id, resource: data.resource, action: data.action },
    });
    return this.toEntity(row);
  }

  async assignToRole(roleId: string, permissionId: string): Promise<void> {
    await this.prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      create: { roleId, permissionId },
      update: {},
    });
  }

  async revokeFromRole(roleId: string, permissionId: string): Promise<void> {
    await this.prisma.rolePermission.delete({
      where: { roleId_permissionId: { roleId, permissionId } },
    });
  }

  async roleHasPermission(roleId: string, resource: string, action: string): Promise<boolean> {
    const count = await this.prisma.rolePermission.count({
      where: {
        roleId,
        permission: { resource, action },
      },
    });
    return count > 0;
  }

  private toEntity(row: { id: string; resource: string; action: string }): PermissionEntity {
    return PermissionEntity.create({ id: row.id, resource: row.resource, action: row.action });
  }
}
