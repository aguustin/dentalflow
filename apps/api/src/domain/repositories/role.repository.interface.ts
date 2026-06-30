import { RoleEntity } from '../entities/role.entity';

export interface CreateRoleData {
  id: string;
  name: string;
  organizationId: string;
}

export interface IRoleRepository {
  findById(id: string): Promise<RoleEntity | null>;
  findByNameAndOrganization(name: string, organizationId: string): Promise<RoleEntity | null>;
  findAllByOrganization(organizationId: string): Promise<RoleEntity[]>;
  create(data: CreateRoleData): Promise<RoleEntity>;
  existsByNameAndOrganization(name: string, organizationId: string): Promise<boolean>;
}
