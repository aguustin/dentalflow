import { DomainEvent } from '../../../../domain/events/domain-event.base';

interface AppointmentCreatedPayload {
  appointmentId: string;
  organizationId: string;
  patientId: string;
  startTime: Date;
  endTime: Date;
}

export class AppointmentCreatedEvent extends DomainEvent<AppointmentCreatedPayload> {
  constructor(
    appointmentId: string,
    organizationId: string,
    patientId: string,
    startTime: Date,
    endTime: Date,
  ) {
    super('appointment.created', organizationId, {
      appointmentId,
      organizationId,
      patientId,
      startTime,
      endTime,
    });
  }
}
