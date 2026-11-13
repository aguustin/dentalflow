import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IAppointmentRepository } from '../../domain/repositories/appointment.repository.interface';
import { AppointmentCancelledEvent } from '../../domain/events/appointment-cancelled.event';
import { IEventBus } from '../../../../shared/types/event-bus.interface';
import { TOKENS } from '../../../../shared/injection-tokens';
import { APPOINTMENT_REPOSITORY_TOKEN } from '../../appointments.tokens';
import { AppointmentDto, toAppointmentDto } from '../dtos/appointment.dto';

@Injectable()
export class CancelAppointmentUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY_TOKEN)
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject(TOKENS.EVENT_BUS)
    private readonly eventBus: IEventBus,
  ) {}

  async execute(id: string, organizationId: string): Promise<AppointmentDto> {
    const appointment = await this.appointmentRepository.findById(id, organizationId);
    if (!appointment) throw new NotFoundException('Appointment not found');

    let cancelled: typeof appointment;
    try {
      cancelled = appointment.cancel();
    } catch (err: unknown) {
      throw new BadRequestException(err instanceof Error ? err.message : String(err));
    }
    const saved = await this.appointmentRepository.save(cancelled);

    await this.eventBus.publish(
      new AppointmentCancelledEvent(id, organizationId, appointment.customerId),
    );

    return toAppointmentDto(saved);
  }
}
