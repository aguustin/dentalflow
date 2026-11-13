import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { IAppointmentRepository } from '../../domain/repositories/appointment.repository.interface';
import { APPOINTMENT_REPOSITORY_TOKEN } from '../../appointments.tokens';

@Injectable()
export class AppointmentOverlapService {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY_TOKEN)
    private readonly appointmentRepository: IAppointmentRepository,
  ) {}

  async assertNoOverlap(
    customerId: string,
    organizationId: string,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: string,
  ): Promise<void> {
    const overlapping = await this.appointmentRepository.findOverlapping(
      customerId,
      organizationId,
      { startTime, endTime },
      excludeAppointmentId,
    );

    if (overlapping.length > 0) {
      const conflict = overlapping[0];
      throw new ConflictException(
        `Customer already has an appointment from ` +
          `${conflict.timeRange.startTime.toISOString()} to ` +
          `${conflict.timeRange.endTime.toISOString()}`,
      );
    }
  }
}
