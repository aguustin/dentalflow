import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { CreateRoleUseCase } from '../../../application/use-cases/rbac/create-role.use-case';
import { AssignRoleUseCase } from '../../../application/use-cases/rbac/assign-role.use-case';

@Module({
  controllers: [RolesController],
  providers: [CreateRoleUseCase, AssignRoleUseCase],
})
export class RolesModule {}
