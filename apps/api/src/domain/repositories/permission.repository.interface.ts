import { PermissionEntity } from '../entities/permission.entity';

export interface CreatePermissionData {
  id: string;
  resource: string;
  action: string;
}

export interface IPermissionRepository {
  findById(id: string): Promise<PermissionEntity | null>;
  findByKey(resource: string, action: string): Promise<PermissionEntity | null>;
  findByRoleId(roleId: string): Promise<PermissionEntity[]>;
  findAll(): Promise<PermissionEntity[]>;
  create(data: CreatePermissionData): Promise<PermissionEntity>;
  assignToRole(roleId: string, permissionId: string): Promise<void>;
  revokeFromRole(roleId: string, permissionId: string): Promise<void>;
  roleHasPermission(roleId: string, resource: string, action: string): Promise<boolean>;
}
