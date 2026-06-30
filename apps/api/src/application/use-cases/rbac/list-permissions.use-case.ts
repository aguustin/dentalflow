import { Inject, Injectable } from '@nestjs/common';
import { IPermissionRepository } from '../../../domain/repositories/permission.repository.interface';
import { TOKENS } from '../../../shared/injection-tokens';
import { PermissionResponseDto } from '../../dtos/role.dto';

@Injectable()
export class ListPermissionsUseCase {
  constructor(
    @Inject(TOKENS.PERMISSION_REPOSITORY)
    private readonly permissionRepository: IPermissionRepository,
  ) {}

  async execute(): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionRepository.findAll();
    return permissions.map((p) => ({
      id: p.id,
      resource: p.resource,
      action: p.action,
      key: p.key,
    }));
  }
}
