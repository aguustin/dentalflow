import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { IAppointmentRepository } from '../../domain/repositories/appointment.repository.interface';
import { TimeRange } from '../../domain/value-objects/time-range.vo';
import { AppointmentStatusEnum } from '../../domain/value-objects/appointment-status.vo';
import { AppointmentRescheduledEvent } from '../../domain/events/appointment-rescheduled.event';
import { IEventBus } from '../../../../shared/types/event-bus.interface';
import { TOKENS } from '../../../../shared/injection-tokens';
import { APPOINTMENT_REPOSITORY_TOKEN, STAFF_DIRECTORY_TOKEN } from '../../appointments.tokens';
import { IStaffDirectory } from '../services/staff-directory.interface';
import { RescheduleAppointmentCommand, AppointmentDto, toAppointmentDto } from '../dtos/appointment.dto';
import { AppointmentOverlapService } from '../services/appointment-overlap.service';
import { CompleteAppointmentUseCase } from './complete-appointment.use-case';

// Status values that RescheduleUseCase handles directly (not delegated)
const DIRECT_TRANSITION_STATUSES = new Set([
  AppointmentStatusEnum.CONFIRMED,
  AppointmentStatusEnum.NO_SHOW,
]);

@Injectable()
export class RescheduleAppointmentUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY_TOKEN)
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject(TOKENS.EVENT_BUS)
    private readonly eventBus: IEventBus,
    private readonly overlapService: AppointmentOverlapService,
    private readonly completeAppointment: CompleteAppointmentUseCase,
    @Inject(STAFF_DIRECTORY_TOKEN)
    private readonly staffDirectory: IStaffDirectory,
  ) {}

  async execute(
    id: string,
    organizationId: string,
    command: RescheduleAppointmentCommand,
  ): Promise<AppointmentDto> {
    // COMPLETED is a dedicated workflow — delegate to CompleteAppointmentUseCase
    if (command.status === AppointmentStatusEnum.COMPLETED) {
      if (command.startTime || command.endTime) {
        throw new BadRequestException(
          'Cannot reschedule and complete an appointment in the same operation',
        );
      }
      return this.completeAppointment.execute(id, organizationId);
    }

    const appointment = await this.appointmentRepository.findById(id, organizationId);
    if (!appointment) throw new NotFoundException('Appointment not found');

    let updated = appointment;
    let timeChanged = false;

    // 1. Time reschedule (overlap check + entity method)
    if (command.startTime !== undefined || command.endTime !== undefined) {
      const rawStart = command.startTime ?? appointment.timeRange.startTime;
      const rawEnd = command.endTime ?? appointment.timeRange.endTime;
      const newStart = new Date(rawStart);
      const newEnd = new Date(rawEnd);

      if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
        throw new UnprocessableEntityException('Invalid date format');
      }

      let newTimeRange: TimeRange;
      try {
        newTimeRange = TimeRange.create(newStart, newEnd);
      } catch (err: unknown) {
        throw new BadRequestException(err instanceof Error ? err.message : String(err));
      }

      try {
        updated = updated.reschedule(newTimeRange);
      } catch (err: unknown) {
        throw new BadRequestException(err instanceof Error ? err.message : String(err));
      }
      timeChanged = true;
    }

    // 1b. Reassign staff / resource
    const staffChanged = command.staffId !== undefined && command.staffId !== appointment.staffId;
    const resourceChanged =
      command.resourceId !== undefined && command.resourceId !== appointment.resourceId;
    if (staffChanged || resourceChanged) {
      if (staffChanged && !(await this.staffDirectory.isActiveStaff(command.staffId!, organizationId))) {
        throw new NotFoundException(`Staff member '${command.staffId}' not found in this organization`);
      }
      if (
        resourceChanged &&
        command.resourceId &&
        !(await this.staffDirectory.isActiveResource(command.resourceId, organizationId))
      ) {
        throw new NotFoundException(`Resource '${command.resourceId}' not found in this organization`);
      }
      try {
        updated = updated.reassign({ staffId: command.staffId, resourceId: command.resourceId });
      } catch (err: unknown) {
        throw new BadRequestException(err instanceof Error ? err.message : String(err));
      }
    }

    // One overlap check with the final time + participants
    if (timeChanged || staffChanged || resourceChanged) {
      await this.overlapService.assertNoOverlap(
        { customerId: updated.customerId, staffId: updated.staffId, resourceId: updated.resourceId },
        organizationId,
        updated.timeRange.startTime,
        updated.timeRange.endTime,
        id,
      );
    }

    // 2. Title / description update
    if (command.title !== undefined || command.description !== undefined) {
      try {
        updated = updated.updateDetails({
          title: command.title,
          description: command.description,
        });
      } catch (err: unknown) {
        throw new BadRequestException(err instanceof Error ? err.message : String(err));
      }
    }

    // 3. Direct status transitions (CONFIRMED, NO_SHOW)
    if (command.status) {
      if (!DIRECT_TRANSITION_STATUSES.has(command.status as AppointmentStatusEnum)) {
        throw new BadRequestException(
          `Status '${command.status}' cannot be set via update. ` +
            `Use DELETE to cancel. COMPLETED is handled automatically.`,
        );
      }
      try {
        switch (command.status as AppointmentStatusEnum) {
          case AppointmentStatusEnum.CONFIRMED:
            updated = updated.confirm();
            break;
          case AppointmentStatusEnum.NO_SHOW:
            updated = updated.markNoShow();
            break;
        }
      } catch (err: unknown) {
        throw new BadRequestException(err instanceof Error ? err.message : String(err));
      }
    }

    const saved = await this.appointmentRepository.save(updated);

    if (timeChanged) {
      await this.eventBus.publish(
        new AppointmentRescheduledEvent(
          id,
          organizationId,
          appointment.customerId,
          saved.timeRange.startTime,
          saved.timeRange.endTime,
        ),
      );
    }

    return toAppointmentDto(saved);
  }
}
