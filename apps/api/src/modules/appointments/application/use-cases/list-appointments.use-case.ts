import { Inject, Injectable } from '@nestjs/common';
import { IAppointmentRepository } from '../../domain/repositories/appointment.repository.interface';
import {
  APPOINTMENT_REPOSITORY_TOKEN,
  CUSTOMER_EXISTENCE_CHECKER_TOKEN,
  STAFF_DIRECTORY_TOKEN,
} from '../../appointments.tokens';
import { IStaffDirectory } from '../services/staff-directory.interface';
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
    @Inject(STAFF_DIRECTORY_TOKEN)
    private readonly staffDirectory: IStaffDirectory,
  ) {}

  async execute(
    organizationId: string,
    filters?: ListAppointmentsFilters,
  ): Promise<ListAppointmentsResult> {
    const limit = Math.min(filters?.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const offset = Math.max(filters?.offset ?? 0, 0);

    const { items, total } = await this.appointmentRepository.findAll(organizationId, {
      customerId: filters?.customerId,
      staffId: filters?.staffId,
      status: filters?.status,
      startAfter: filters?.startAfter,
      startBefore: filters?.startBefore,
      limit,
      offset,
    });

    const [names, staff] = await Promise.all([
      this.customerChecker.findNames(
        items.map((a) => a.customerId),
        organizationId,
      ),
      this.staffDirectory.findStaffInfo(
        items.map((a) => a.staffId),
        organizationId,
      ),
    ]);

    return {
      items: items.map((a) => ({
        ...toAppointmentDto(a),
        customerName: names.get(a.customerId),
        staffName: staff.get(a.staffId)?.name,
        staffColor: staff.get(a.staffId)?.color,
      })),
      total,
      limit,
      offset,
    };
  }
}
