import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { CreateOrganizationUseCase } from '../../../application/use-cases/organizations/create-organization.use-case';
import { AddUserToOrganizationUseCase } from '../../../application/use-cases/organizations/add-user-to-organization.use-case';
import { ListMembersUseCase } from '../../../application/use-cases/organizations/list-members.use-case';

@Module({
  controllers: [OrganizationsController],
  providers: [CreateOrganizationUseCase, AddUserToOrganizationUseCase, ListMembersUseCase],
})
export class OrganizationsModule {}
