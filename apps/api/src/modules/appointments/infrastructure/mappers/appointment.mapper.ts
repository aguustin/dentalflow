import { AppointmentEntity } from '../../domain/entities/appointment.entity';
import { TimeRange } from '../../domain/value-objects/time-range.vo';
import { AppointmentStatus } from '../../domain/value-objects/appointment-status.vo';

interface AppointmentRow {
  id: string;
  organizationId: string;
  customerId: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class AppointmentMapper {
  static toDomain(row: AppointmentRow): AppointmentEntity {
    return AppointmentEntity.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      customerId: row.customerId,
      title: row.title,
      description: row.description,
      timeRange: TimeRange.create(row.startTime, row.endTime),
      status: AppointmentStatus.fromString(row.status),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
