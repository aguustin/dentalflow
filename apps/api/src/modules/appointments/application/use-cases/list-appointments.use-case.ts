import { Inject, Injectable } from '@nestjs/common';
import { IAppointmentRepository } from '../../domain/repositories/appointment.repository.interface';
import { APPOINTMENT_REPOSITORY_TOKEN } from '../../appointments.tokens';
import {
  ListAppointmentsFilters,
  ListAppointmentsResult,
  toAppointmentDto,
} from '../dtos/appointment.dto';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

@Injectable()
export class ListAppointmentsUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY_TOKEN)
    private readonly appointmentRepository: IAppointmentRepository,
  ) {}

  async execute(
    organizationId: string,
    filters?: ListAppointmentsFilters,
  ): Promise<ListAppointmentsResult> {
    const limit = Math.min(filters?.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const offset = Math.max(filters?.offset ?? 0, 0);

    const { items, total } = await this.appointmentRepository.findAll(organizationId, {
      patientId: filters?.patientId,
      status: filters?.status,
      startAfter: filters?.startAfter,
      startBefore: filters?.startBefore,
      limit,
      offset,
    });

    return {
      items: items.map(toAppointmentDto),
      total,
      limit,
      offset,
    };
  }
}
