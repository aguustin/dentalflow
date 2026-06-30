import { TimeRange } from '../value-objects/time-range.vo';
import { AppointmentStatus, AppointmentStatusEnum } from '../value-objects/appointment-status.vo';

export interface CreateAppointmentProps {
  id: string;
  organizationId: string;
  patientId: string;
  title: string;
  description?: string | null;
  startTime: Date;
  endTime: Date;
}

export interface ReconstructAppointmentProps {
  id: string;
  organizationId: string;
  patientId: string;
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
  public readonly patientId: string;
  public readonly title: string;
  public readonly description: string | null;
  public readonly timeRange: TimeRange;
  public readonly status: AppointmentStatus;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: ReconstructAppointmentProps) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.patientId = props.patientId;
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
      patientId: props.patientId,
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

  updateDetails(changes: { title?: string; description?: string | null }): AppointmentEntity {
    if (this.status.isTerminal()) {
      throw new Error(
        `Cannot update appointment details in terminal state: ${this.status.value}`,
      );
    }
    return new AppointmentEntity({
      ...this._snapshot(),
      title: changes.title !== undefined ? changes.title.trim() || this.title : this.title,
      description: changes.description !== undefined ? changes.description : this.description,
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
      patientId: this.patientId,
      title: this.title,
      description: this.description,
      timeRange: this.timeRange,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
