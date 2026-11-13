import { Inject, Injectable } from '@nestjs/common';
import { IAppointmentRepository } from '../../domain/repositories/appointment.repository.interface';
import { APPOINTMENT_REPOSITORY_TOKEN, CUSTOMER_EXISTENCE_CHECKER_TOKEN } from '../../appointments.tokens';
import { ICustomerExistenceChecker } from '../services/customer-existence-checker.interface';
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
    @Inject(CUSTOMER_EXISTENCE_CHECKER_TOKEN)
    private readonly customerChecker: ICustomerExistenceChecker,
  ) {}

  async execute(
    organizationId: string,
    filters?: ListAppointmentsFilters,
  ): Promise<ListAppointmentsResult> {
    const limit = Math.min(filters?.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const offset = Math.max(filters?.offset ?? 0, 0);

    const { items, total } = await this.appointmentRepository.findAll(organizationId, {
      customerId: filters?.customerId,
      status: filters?.status,
      startAfter: filters?.startAfter,
      startBefore: filters?.startBefore,
      limit,
      offset,
    });

    const names = await this.customerChecker.findNames(
      items.map((a) => a.customerId),
      organizationId,
    );

    return {
      items: items.map((a) => ({ ...toAppointmentDto(a), customerName: names.get(a.customerId) })),
      total,
      limit,
      offset,
    };
  }
}
