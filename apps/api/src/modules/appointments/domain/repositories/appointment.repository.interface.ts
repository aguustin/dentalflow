import { AppointmentEntity } from '../entities/appointment.entity';

export interface FindAppointmentsOptions {
  customerId?: string;
  status?: string;
  startAfter?: Date;
  startBefore?: Date;
  limit?: number;
  offset?: number;
}

export interface OverlapCheckRange {
  startTime: Date;
  endTime: Date;
}

export interface IAppointmentRepository {
  findById(id: string, organizationId: string): Promise<AppointmentEntity | null>;
  findAll(
    organizationId: string,
    options?: FindAppointmentsOptions,
  ): Promise<{ items: AppointmentEntity[]; total: number }>;
  findOverlapping(
    customerId: string,
    organizationId: string,
    range: OverlapCheckRange,
    excludeId?: string,
  ): Promise<AppointmentEntity[]>;
  create(entity: AppointmentEntity): Promise<AppointmentEntity>;
  save(entity: AppointmentEntity): Promise<AppointmentEntity>;
}
