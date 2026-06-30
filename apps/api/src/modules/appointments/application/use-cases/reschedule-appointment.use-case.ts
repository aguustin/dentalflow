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
import { APPOINTMENT_REPOSITORY_TOKEN } from '../../appointments.tokens';
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

      await this.overlapService.assertNoOverlap(
        appointment.patientId,
        organizationId,
        newStart,
        newEnd,
        id,
      );

      updated = updated.reschedule(newTimeRange);
      timeChanged = true;
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
          appointment.patientId,
          saved.timeRange.startTime,
          saved.timeRange.endTime,
        ),
      );
    }

    return toAppointmentDto(saved);
  }
}
