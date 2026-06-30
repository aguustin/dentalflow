import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IPermissionRepository } from '../../../domain/repositories/permission.repository.interface';
import { IRoleRepository } from '../../../domain/repositories/role.repository.interface';
import { TOKENS } from '../../../shared/injection-tokens';
import { PermissionResponseDto } from '../../dtos/role.dto';

@Injectable()
export class GetRolePermissionsUseCase {
  constructor(
    @Inject(TOKENS.ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository,
    @Inject(TOKENS.PERMISSION_REPOSITORY)
    private readonly permissionRepository: IPermissionRepository,
  ) {}

  async execute(roleId: string, organizationId: string): Promise<PermissionResponseDto[]> {
    const role = await this.roleRepository.findById(roleId);
    if (!role) throw new NotFoundException('Role not found');

    // Strict tenant isolation: role must belong to the requesting organization
    if (role.organizationId !== organizationId) {
      throw new ForbiddenException('Role does not belong to this organization');
    }

    const permissions = await this.permissionRepository.findByRoleId(roleId);
    return permissions.map((p) => ({
      id: p.id,
      resource: p.resource,
      action: p.action,
      key: p.key,
    }));
  }
}
