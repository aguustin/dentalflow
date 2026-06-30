import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IAppointmentRepository } from '../../domain/repositories/appointment.repository.interface';
import { APPOINTMENT_REPOSITORY_TOKEN } from '../../appointments.tokens';
import { AppointmentDto, toAppointmentDto } from '../dtos/appointment.dto';

@Injectable()
export class GetAppointmentUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY_TOKEN)
    private readonly appointmentRepository: IAppointmentRepository,
  ) {}

  async execute(id: string, organizationId: string): Promise<AppointmentDto> {
    const appointment = await this.appointmentRepository.findById(id, organizationId);
    if (!appointment) throw new NotFoundException('Appointment not found');
    return toAppointmentDto(appointment);
  }
}
