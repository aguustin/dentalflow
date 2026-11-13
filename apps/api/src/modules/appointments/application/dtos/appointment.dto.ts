import { AppointmentEntity } from '../../domain/entities/appointment.entity';

export interface AppointmentDto {
  id: string;
  organizationId: string;
  customerId: string;
  /** Only present in listings */
  customerName?: string;
  staffId: string;
  /** Only present in listings */
  staffName?: string;
  /** Only present in listings */
  staffColor?: string;
  resourceId: string | null;
  serviceId: string | null;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAppointmentCommand {
  organizationId: string;
  customerId: string;
  staffId: string;
  resourceId?: string | null;
  serviceId?: string | null;
  title: string;
  description?: string | null;
  startTime: Date;
  endTime: Date;
}

export interface RescheduleAppointmentCommand {
  staffId?: string;
  /** null removes the resource */
  resourceId?: string | null;
  /** null removes the service */
  serviceId?: string | null;
  title?: string;
  description?: string | null;
  startTime?: Date;
  endTime?: Date;
  status?: string;
}

export interface ListAppointmentsFilters {
  customerId?: string;
  staffId?: string;
  status?: string;
  startAfter?: Date;
  startBefore?: Date;
  limit?: number;
  offset?: number;
}

export interface ListAppointmentsResult {
  items: AppointmentDto[];
  total: number;
  limit: number;
  offset: number;
}

export function toAppointmentDto(entity: AppointmentEntity): AppointmentDto {
  return {
    id: entity.id,
    organizationId: entity.organizationId,
    customerId: entity.customerId,
    staffId: entity.staffId,
    resourceId: entity.resourceId,
    serviceId: entity.serviceId,
    title: entity.title,
    description: entity.description,
    startTime: entity.timeRange.startTime,
    endTime: entity.timeRange.endTime,
    durationMinutes: entity.timeRange.getDurationMinutes(),
    status: entity.status.value,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
