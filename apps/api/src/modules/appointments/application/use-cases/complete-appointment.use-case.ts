import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IAppointmentRepository } from '../../domain/repositories/appointment.repository.interface';
import { AppointmentCompletedEvent } from '../../domain/events/appointment-completed.event';
import { IEventBus } from '../../../../shared/types/event-bus.interface';
import { TOKENS } from '../../../../shared/injection-tokens';
import { APPOINTMENT_REPOSITORY_TOKEN } from '../../appointments.tokens';
import { AppointmentDto, toAppointmentDto } from '../dtos/appointment.dto';

@Injectable()
export class CompleteAppointmentUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY_TOKEN)
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject(TOKENS.EVENT_BUS)
    private readonly eventBus: IEventBus,
  ) {}

  async execute(id: string, organizationId: string): Promise<AppointmentDto> {
    const appointment = await this.appointmentRepository.findById(id, organizationId);
    if (!appointment) throw new NotFoundException('Appointment not found');

    const completed = appointment.complete(); // throws if invalid transition
    const saved = await this.appointmentRepository.save(completed);

    await this.eventBus.publish(
      new AppointmentCompletedEvent(id, organizationId, appointment.patientId),
    );

    return toAppointmentDto(saved);
  }
}
