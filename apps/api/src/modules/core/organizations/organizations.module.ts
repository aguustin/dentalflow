import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { CreateOrganizationUseCase } from '../../../application/use-cases/organizations/create-organization.use-case';
import { AddUserToOrganizationUseCase } from '../../../application/use-cases/organizations/add-user-to-organization.use-case';

@Module({
  controllers: [OrganizationsController],
  providers: [CreateOrganizationUseCase, AddUserToOrganizationUseCase],
})
export class OrganizationsModule {}
