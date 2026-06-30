import { DomainEvent } from '../../../../domain/events/domain-event.base';

interface AppointmentRescheduledPayload {
  appointmentId: string;
  organizationId: string;
  patientId: string;
  newStartTime: Date;
  newEndTime: Date;
}

export class AppointmentRescheduledEvent extends DomainEvent<AppointmentRescheduledPayload> {
  constructor(
    appointmentId: string,
    organizationId: string,
    patientId: string,
    newStartTime: Date,
    newEndTime: Date,
  ) {
    super('appointment.rescheduled', organizationId, {
      appointmentId,
      organizationId,
      patientId,
      newStartTime,
      newEndTime,
    });
  }
}
