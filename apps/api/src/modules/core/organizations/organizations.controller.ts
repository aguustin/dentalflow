import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../shared/decorators/public.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/require-permissions.decorator';
import { RequestUser } from '../../../shared/types/request-user.type';
import { CreateOrganizationUseCase } from '../../../application/use-cases/organizations/create-organization.use-case';
import { AddUserToOrganizationUseCase } from '../../../application/use-cases/organizations/add-user-to-organization.use-case';
import { ListMembersUseCase, MemberDto } from '../../../application/use-cases/organizations/list-members.use-case';
import {
  AddUserToOrganizationDto,
  CreateOrganizationDto,
  OrganizationResponseDto,
} from '../../../application/dtos/organization.dto';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly createOrganization: CreateOrganizationUseCase,
    private readonly addUserToOrganization: AddUserToOrganizationUseCase,
    private readonly listMembers: ListMembersUseCase,
  ) {}

  @ApiBearerAuth()
  @Get('members')
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'List members of the current organization with their role' })
  members(@CurrentUser() actor: RequestUser): Promise<MemberDto[]> {
    return this.listMembers.execute(actor.organizationId);
  }

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new organization with initial admin user' })
  create(@Body() dto: CreateOrganizationDto): Promise<OrganizationResponseDto> {
    return this.createOrganization.execute(dto);
  }

  @ApiBearerAuth()
  @Post('members')
  @RequirePermissions('organizations.manage')
  @ApiOperation({ summary: 'Add a user to the current organization' })
  addMember(
    @Body() dto: AddUserToOrganizationDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.addUserToOrganization.execute(dto, actor);
  }
}
