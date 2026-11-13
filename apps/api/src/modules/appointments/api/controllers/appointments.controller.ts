import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { RequireModule } from '../../../../shared/decorators/require-module.decorator';
import { RequirePermissions } from '../../../../shared/decorators/require-permissions.decorator';
import { RequestUser } from '../../../../shared/types/request-user.type';
import { CreateAppointmentUseCase } from '../../application/use-cases/create-appointment.use-case';
import { GetAppointmentUseCase } from '../../application/use-cases/get-appointment.use-case';
import { ListAppointmentsUseCase } from '../../application/use-cases/list-appointments.use-case';
import { RescheduleAppointmentUseCase } from '../../application/use-cases/reschedule-appointment.use-case';
import { CancelAppointmentUseCase } from '../../application/use-cases/cancel-appointment.use-case';
import { GetAvailabilityUseCase } from '../../application/use-cases/get-availability.use-case';
import { AvailabilityRequest } from '../requests/availability.request';
import { AppointmentDto, ListAppointmentsResult } from '../../application/dtos/appointment.dto';
import { CreateAppointmentRequest } from '../requests/create-appointment.request';
import { UpdateAppointmentRequest } from '../requests/update-appointment.request';
import { ListAppointmentsRequest } from '../requests/list-appointments.request';

@ApiTags('Appointments')
@ApiBearerAuth()
@RequireModule('scheduling')
@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly createAppointment: CreateAppointmentUseCase,
    private readonly getAppointment: GetAppointmentUseCase,
    private readonly listAppointments: ListAppointmentsUseCase,
    private readonly rescheduleAppointment: RescheduleAppointmentUseCase,
    private readonly cancelAppointment: CancelAppointmentUseCase,
    private readonly getAvailability: GetAvailabilityUseCase,
  ) {}

  // Declared before ':id' so "availability" is not captured as an id
  @Get('availability')
  @RequirePermissions('appointments.read')
  @ApiOperation({ summary: 'Free slots of a staff member on a day (org time zone)' })
  availability(@Query() query: AvailabilityRequest, @CurrentUser() actor: RequestUser) {
    return this.getAvailability.execute(actor.organizationId, {
      staffId: query.staffId,
      date: query.date,
      durationMinutes: query.duration ?? 30,
    });
  }

  @Post()
  @RequirePermissions('appointments.create')
  @ApiOperation({ summary: 'Schedule a new appointment for a customer' })
  create(
    @Body() body: CreateAppointmentRequest,
    @CurrentUser() actor: RequestUser,
  ): Promise<AppointmentDto> {
    return this.createAppointment.execute({
      organizationId: actor.organizationId,
      customerId: body.customerId,
      staffId: body.staffId,
      resourceId: body.resourceId,
      title: body.title,
      description: body.description,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
    });
  }

  @Get()
  @RequirePermissions('appointments.read')
  @ApiOperation({ summary: 'List appointments in the organization' })
  findAll(
    @Query() query: ListAppointmentsRequest,
    @CurrentUser() actor: RequestUser,
  ): Promise<ListAppointmentsResult> {
    return this.listAppointments.execute(actor.organizationId, {
      customerId: query.customerId,
      staffId: query.staffId,
      status: query.status,
      startAfter: query.startAfter ? new Date(query.startAfter) : undefined,
      startBefore: query.startBefore ? new Date(query.startBefore) : undefined,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get(':id')
  @RequirePermissions('appointments.read')
  @ApiOperation({ summary: 'Get an appointment by ID' })
  findOne(@Param('id') id: string, @CurrentUser() actor: RequestUser): Promise<AppointmentDto> {
    return this.getAppointment.execute(id, actor.organizationId);
  }

  @Put(':id')
  @RequirePermissions('appointments.update')
  @ApiOperation({
    summary: 'Update appointment — reschedule, update details, or transition status (CONFIRMED / COMPLETED / NO_SHOW)',
  })
  update(
    @Param('id') id: string,
    @Body() body: UpdateAppointmentRequest,
    @CurrentUser() actor: RequestUser,
  ): Promise<AppointmentDto> {
    return this.rescheduleAppointment.execute(id, actor.organizationId, {
      staffId: body.staffId,
      resourceId: body.resourceId,
      title: body.title,
      description: body.description,
      startTime: body.startTime ? new Date(body.startTime) : undefined,
      endTime: body.endTime ? new Date(body.endTime) : undefined,
      status: body.status,
    });
  }

  @Delete(':id')
  @RequirePermissions('appointments.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an appointment' })
  cancel(@Param('id') id: string, @CurrentUser() actor: RequestUser): Promise<AppointmentDto> {
    return this.cancelAppointment.execute(id, actor.organizationId);
  }
}
