import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequireModule } from '../../../shared/decorators/require-module.decorator';
import { RequirePermissions } from '../../../shared/decorators/require-permissions.decorator';
import { RequestUser } from '../../../shared/types/request-user.type';
import { ResourcesService, StaffService } from '../application/staff.service';
import {
  AddTimeOffRequest,
  CreateResourceRequest,
  CreateStaffRequest,
  ListStaffRequest,
  SetWorkingHoursRequest,
  UpdateResourceRequest,
  UpdateStaffRequest,
} from './staff.requests';

@ApiTags('Staff')
@ApiBearerAuth()
@RequireModule('scheduling')
@Controller('staff')
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  @RequirePermissions('staff.read')
  @ApiOperation({ summary: 'List staff members (with weekly working hours)' })
  list(@Query() query: ListStaffRequest, @CurrentUser() actor: RequestUser) {
    return this.staff.list(actor.organizationId, query.includeInactive);
  }

  @Post()
  @RequirePermissions('staff.create')
  create(@Body() body: CreateStaffRequest, @CurrentUser() actor: RequestUser) {
    return this.staff.create(actor.organizationId, body);
  }

  @Get(':id')
  @RequirePermissions('staff.read')
  @ApiOperation({ summary: 'Get a staff member with working hours and upcoming time off' })
  get(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.staff.get(id, actor.organizationId);
  }

  @Put(':id')
  @RequirePermissions('staff.update')
  @ApiOperation({ summary: 'Update profile or deactivate (isActive=false). Staff is never deleted.' })
  update(@Param('id') id: string, @Body() body: UpdateStaffRequest, @CurrentUser() actor: RequestUser) {
    return this.staff.update(id, actor.organizationId, body);
  }

  @Put(':id/working-hours')
  @RequirePermissions('staff.update')
  @ApiOperation({ summary: 'Replace the weekly working hours' })
  setWorkingHours(
    @Param('id') id: string,
    @Body() body: SetWorkingHoursRequest,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.staff.setWorkingHours(id, actor.organizationId, body.ranges);
  }

  @Post(':id/time-off')
  @RequirePermissions('staff.update')
  addTimeOff(@Param('id') id: string, @Body() body: AddTimeOffRequest, @CurrentUser() actor: RequestUser) {
    return this.staff.addTimeOff(id, actor.organizationId, {
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      reason: body.reason,
    });
  }

  @Delete(':id/time-off/:timeOffId')
  @RequirePermissions('staff.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTimeOff(
    @Param('id') id: string,
    @Param('timeOffId') timeOffId: string,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.staff.removeTimeOff(id, actor.organizationId, timeOffId);
  }
}

@ApiTags('Resources')
@ApiBearerAuth()
@RequireModule('scheduling')
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resources: ResourcesService) {}

  @Get()
  @RequirePermissions('staff.read')
  list(@Query() query: ListStaffRequest, @CurrentUser() actor: RequestUser) {
    return this.resources.list(actor.organizationId, query.includeInactive);
  }

  @Post()
  @RequirePermissions('staff.create')
  create(@Body() body: CreateResourceRequest, @CurrentUser() actor: RequestUser) {
    return this.resources.create(actor.organizationId, body.name);
  }

  @Put(':id')
  @RequirePermissions('staff.update')
  update(@Param('id') id: string, @Body() body: UpdateResourceRequest, @CurrentUser() actor: RequestUser) {
    return this.resources.update(id, actor.organizationId, body);
  }
}
