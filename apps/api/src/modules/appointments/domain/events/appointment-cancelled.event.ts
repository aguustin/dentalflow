import { DomainEvent } from '../../../../domain/events/domain-event.base';

interface AppointmentCancelledPayload {
  appointmentId: string;
  organizationId: string;
  patientId: string;
}

export class AppointmentCancelledEvent extends DomainEvent<AppointmentCancelledPayload> {
  constructor(appointmentId: string, organizationId: string, patientId: string) {
    super('appointment.cancelled', organizationId, { appointmentId, organizationId, patientId });
  }
}
