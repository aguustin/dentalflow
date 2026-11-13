import { TimeRange } from '../value-objects/time-range.vo';
import { AppointmentStatus, AppointmentStatusEnum } from '../value-objects/appointment-status.vo';

export interface CreateAppointmentProps {
  id: string;
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

export interface ReconstructAppointmentProps {
  id: string;
  organizationId: string;
  customerId: string;
  staffId: string;
  resourceId: string | null;
  serviceId: string | null;
  title: string;
  description: string | null;
  timeRange: TimeRange;
  status: AppointmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class AppointmentEntity {
  public readonly id: string;
  public readonly organizationId: string;
  public readonly customerId: string;
  public readonly staffId: string;
  public readonly resourceId: string | null;
  public readonly serviceId: string | null;
  public readonly title: string;
  public readonly description: string | null;
  public readonly timeRange: TimeRange;
  public readonly status: AppointmentStatus;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: ReconstructAppointmentProps) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.customerId = props.customerId;
    this.staffId = props.staffId;
    this.resourceId = props.resourceId;
    this.serviceId = props.serviceId;
    this.title = props.title;
    this.description = props.description;
    this.timeRange = props.timeRange;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  // Factory: new appointment from user input
  static create(props: CreateAppointmentProps): AppointmentEntity {
    const title = props.title?.trim();
    if (!title) throw new Error('Appointment title is required');

    return new AppointmentEntity({
      id: props.id,
      organizationId: props.organizationId,
      customerId: props.customerId,
      staffId: props.staffId,
      resourceId: props.resourceId ?? null,
      serviceId: props.serviceId ?? null,
      title,
      description: props.description?.trim() || null,
      timeRange: TimeRange.create(props.startTime, props.endTime),
      status: AppointmentStatus.initial(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Factory: reconstruct from persistence
  static reconstitute(props: ReconstructAppointmentProps): AppointmentEntity {
    return new AppointmentEntity(props);
  }

  reschedule(newTimeRange: TimeRange): AppointmentEntity {
    if (this.status.isTerminal()) {
      throw new Error(
        `Cannot reschedule appointment in terminal state: ${this.status.value}`,
      );
    }
    return new AppointmentEntity({
      ...this._snapshot(),
      timeRange: newTimeRange,
      status: AppointmentStatus.initial(), // resets to SCHEDULED — needs re-confirmation
      updatedAt: new Date(),
    });
  }

  confirm(): AppointmentEntity {
    return this._applyTransition(AppointmentStatusEnum.CONFIRMED);
  }

  complete(): AppointmentEntity {
    return this._applyTransition(AppointmentStatusEnum.COMPLETED);
  }

  cancel(): AppointmentEntity {
    return this._applyTransition(AppointmentStatusEnum.CANCELLED);
  }

  markNoShow(): AppointmentEntity {
    return this._applyTransition(AppointmentStatusEnum.NO_SHOW);
  }

  updateDetails(changes: {
    title?: string;
    description?: string | null;
    serviceId?: string | null;
  }): AppointmentEntity {
    if (this.status.isTerminal()) {
      throw new Error(
        `Cannot update appointment details in terminal state: ${this.status.value}`,
      );
    }
    return new AppointmentEntity({
      ...this._snapshot(),
      title: changes.title !== undefined ? changes.title.trim() || this.title : this.title,
      description: changes.description !== undefined ? changes.description : this.description,
      serviceId: changes.serviceId !== undefined ? changes.serviceId : this.serviceId,
      updatedAt: new Date(),
    });
  }

  /** Moves the appointment to another staff member and/or resource (null clears the resource). */
  reassign(changes: { staffId?: string; resourceId?: string | null }): AppointmentEntity {
    if (this.status.isTerminal()) {
      throw new Error(`Cannot reassign appointment in terminal state: ${this.status.value}`);
    }
    return new AppointmentEntity({
      ...this._snapshot(),
      staffId: changes.staffId ?? this.staffId,
      resourceId: changes.resourceId !== undefined ? changes.resourceId : this.resourceId,
      updatedAt: new Date(),
    });
  }

  private _applyTransition(next: AppointmentStatusEnum): AppointmentEntity {
    return new AppointmentEntity({
      ...this._snapshot(),
      status: this.status.transitionTo(next),
      updatedAt: new Date(),
    });
  }

  private _snapshot(): ReconstructAppointmentProps {
    return {
      id: this.id,
      organizationId: this.organizationId,
      customerId: this.customerId,
      staffId: this.staffId,
      resourceId: this.resourceId,
      serviceId: this.serviceId,
      title: this.title,
      description: this.description,
      timeRange: this.timeRange,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
