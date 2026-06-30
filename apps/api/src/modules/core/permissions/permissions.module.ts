import { Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller';
import { ListPermissionsUseCase } from '../../../application/use-cases/rbac/list-permissions.use-case';
import { GetRolePermissionsUseCase } from '../../../application/use-cases/rbac/get-role-permissions.use-case';
import { AssignPermissionsToRoleUseCase } from '../../../application/use-cases/rbac/assign-permissions-to-role.use-case';

@Module({
  controllers: [PermissionsController],
  providers: [ListPermissionsUseCase, GetRolePermissionsUseCase, AssignPermissionsToRoleUseCase],
})
export class PermissionsModule {}
