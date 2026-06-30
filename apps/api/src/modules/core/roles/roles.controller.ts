import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/require-permissions.decorator';
import { RequestUser } from '../../../shared/types/request-user.type';
import { CreateRoleUseCase } from '../../../application/use-cases/rbac/create-role.use-case';
import { AssignRoleUseCase } from '../../../application/use-cases/rbac/assign-role.use-case';
import { AssignRoleDto, CreateRoleDto, RoleResponseDto } from '../../../application/dtos/role.dto';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(
    private readonly createRole: CreateRoleUseCase,
    private readonly assignRole: AssignRoleUseCase,
  ) {}

  @Post()
  @RequirePermissions('roles.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a role within the current organization' })
  create(@Body() dto: CreateRoleDto, @CurrentUser() actor: RequestUser): Promise<RoleResponseDto> {
    return this.createRole.execute(dto, actor);
  }

  @Post('assign')
  @RequirePermissions('roles.assign')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Assign a role to a user in the current organization' })
  async assign(@Body() dto: AssignRoleDto, @CurrentUser() actor: RequestUser): Promise<void> {
    await this.assignRole.execute(dto, actor);
  }
}
