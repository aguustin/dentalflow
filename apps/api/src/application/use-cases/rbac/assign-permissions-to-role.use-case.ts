import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IPermissionRepository } from '../../../domain/repositories/permission.repository.interface';
import { IRoleRepository } from '../../../domain/repositories/role.repository.interface';
import { TOKENS } from '../../../shared/injection-tokens';

@Injectable()
export class AssignPermissionsToRoleUseCase {
  constructor(
    @Inject(TOKENS.ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository,
    @Inject(TOKENS.PERMISSION_REPOSITORY)
    private readonly permissionRepository: IPermissionRepository,
  ) {}

  async execute(roleId: string, permissionIds: string[], organizationId: string): Promise<void> {
    const role = await this.roleRepository.findById(roleId);
    if (!role) throw new NotFoundException('Role not found');

    // Strict tenant isolation: role must belong to the requesting organization
    if (role.organizationId !== organizationId) {
      throw new ForbiddenException('Role does not belong to this organization');
    }

    // Validate each permissionId exists before assigning
    for (const permissionId of permissionIds) {
      const permission = await this.permissionRepository.findById(permissionId);
      if (!permission) throw new NotFoundException(`Permission not found: ${permissionId}`);
      await this.permissionRepository.assignToRole(roleId, permissionId);
    }
  }
}
