import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/require-permissions.decorator';
import { RequestUser } from '../../../shared/types/request-user.type';
import { ListPermissionsUseCase } from '../../../application/use-cases/rbac/list-permissions.use-case';
import { GetRolePermissionsUseCase } from '../../../application/use-cases/rbac/get-role-permissions.use-case';
import { AssignPermissionsToRoleUseCase } from '../../../application/use-cases/rbac/assign-permissions-to-role.use-case';
import { AssignPermissionsDto, PermissionResponseDto } from '../../../application/dtos/role.dto';

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(
    private readonly listPermissions: ListPermissionsUseCase,
    private readonly getRolePermissions: GetRolePermissionsUseCase,
    private readonly assignPermissionsToRole: AssignPermissionsToRoleUseCase,
  ) {}

  @Get()
  @RequirePermissions('permissions.read')
  @ApiOperation({ summary: 'List all available permissions' })
  findAll(): Promise<PermissionResponseDto[]> {
    return this.listPermissions.execute();
  }

  @Get('role/:roleId')
  @RequirePermissions('permissions.read')
  @ApiOperation({ summary: 'List permissions assigned to a role (scoped to current organization)' })
  findByRole(
    @Param('roleId') roleId: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<PermissionResponseDto[]> {
    return this.getRolePermissions.execute(roleId, actor.organizationId);
  }

  @Post('role/:roleId/assign')
  @RequirePermissions('permissions.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Assign permissions to a role (scoped to current organization)' })
  async assignToRole(
    @Param('roleId') roleId: string,
    @Body() dto: AssignPermissionsDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<void> {
    await this.assignPermissionsToRole.execute(roleId, dto.permissionIds, actor.organizationId);
  }
}
