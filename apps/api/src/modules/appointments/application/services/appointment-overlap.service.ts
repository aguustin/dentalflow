import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  IAppointmentRepository,
  OverlapParticipants,
} from '../../domain/repositories/appointment.repository.interface';
import { APPOINTMENT_REPOSITORY_TOKEN } from '../../appointments.tokens';

/**
 * App-level double-booking check with a friendly message. The same rule for staff and
 * resources is also enforced by DB exclusion constraints (safe under concurrency).
 */
@Injectable()
export class AppointmentOverlapService {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY_TOKEN)
    private readonly appointmentRepository: IAppointmentRepository,
  ) {}

  async assertNoOverlap(
    participants: Required<Pick<OverlapParticipants, 'customerId' | 'staffId'>> &
      Pick<OverlapParticipants, 'resourceId'>,
    organizationId: string,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: string,
  ): Promise<void> {
    const overlapping = await this.appointmentRepository.findOverlapping(
      participants,
      organizationId,
      { startTime, endTime },
      excludeAppointmentId,
    );
    if (overlapping.length === 0) return;

    const conflict = overlapping[0];
    const who =
      conflict.staffId === participants.staffId
        ? 'The staff member'
        : participants.resourceId && conflict.resourceId === participants.resourceId
          ? 'The resource'
          : 'The customer';
    throw new ConflictException(
      `${who} already has an appointment from ` +
        `${conflict.timeRange.startTime.toISOString()} to ` +
        `${conflict.timeRange.endTime.toISOString()}`,
    );
  }
}
