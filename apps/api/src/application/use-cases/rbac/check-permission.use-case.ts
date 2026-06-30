import { Inject, Injectable } from '@nestjs/common';
import { IPermissionRepository } from '../../../domain/repositories/permission.repository.interface';
import { TOKENS } from '../../../shared/injection-tokens';

export interface CheckPermissionResult {
  allowed: boolean;
  roleId: string;
  permission: string;
}

@Injectable()
export class CheckPermissionUseCase {
  constructor(
    @Inject(TOKENS.PERMISSION_REPOSITORY)
    private readonly permissionRepository: IPermissionRepository,
  ) {}

  async execute(
    roleId: string,
    resource: string,
    action: string,
  ): Promise<CheckPermissionResult> {
    const allowed = await this.permissionRepository.roleHasPermission(roleId, resource, action);
    return { allowed, roleId, permission: `${resource}.${action}` };
  }
}
