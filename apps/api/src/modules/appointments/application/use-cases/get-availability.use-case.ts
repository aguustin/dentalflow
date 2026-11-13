import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { IAppointmentRepository } from '../../domain/repositories/appointment.repository.interface';
import { IOrganizationRepository } from '../../../../domain/repositories/organization.repository.interface';
import { TOKENS } from '../../../../shared/injection-tokens';
import { computeAvailableSlots } from '../../domain/services/availability';
import { APPOINTMENT_REPOSITORY_TOKEN, STAFF_DIRECTORY_TOKEN } from '../../appointments.tokens';
import { IStaffDirectory } from '../services/staff-directory.interface';

export interface AvailabilityQuery {
  staffId: string;
  /** YYYY-MM-DD in the organization's time zone */
  date: string;
  durationMinutes: number;
}

export interface AvailabilityResult {
  timezone: string;
  slots: { startTime: Date; endTime: Date }[];
}

@Injectable()
export class GetAvailabilityUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY_TOKEN)
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject(STAFF_DIRECTORY_TOKEN)
    private readonly staffDirectory: IStaffDirectory,
    @Inject(TOKENS.ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async execute(organizationId: string, query: AvailabilityQuery): Promise<AvailabilityResult> {
    const org = await this.organizationRepository.findById(organizationId);
    if (!org) throw new NotFoundException('Organization not found');

    const day = DateTime.fromISO(query.date, { zone: org.timezone });
    if (!day.isValid) throw new BadRequestException('date must be a valid YYYY-MM-DD');
    const from = day.startOf('day').toJSDate();
    const to = day.plus({ days: 1 }).startOf('day').toJSDate();

    const schedule = await this.staffDirectory.getSchedule(query.staffId, organizationId, from, to);
    if (!schedule) throw new NotFoundException('Staff member not found in this organization');

    // Active appointments of this staff member touching the day
    const busy = await this.appointmentRepository.findOverlapping(
      { staffId: query.staffId },
      organizationId,
      { startTime: from, endTime: to },
    );

    const slots = computeAvailableSlots({
      date: query.date,
      timezone: org.timezone,
      durationMinutes: query.durationMinutes,
      workingHours: schedule.workingHours,
      blocked: [
        ...schedule.timeOff,
        ...busy.map((a) => ({ start: a.timeRange.startTime, end: a.timeRange.endTime })),
      ],
      notBefore: new Date(),
    });

    return {
      timezone: org.timezone,
      slots: slots.map((s) => ({ startTime: s.start, endTime: s.end })),
    };
  }
}
