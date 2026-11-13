import { DomainEvent } from '../../../../domain/events/domain-event.base';

interface AppointmentCompletedPayload {
  appointmentId: string;
  organizationId: string;
  customerId: string;
}

export class AppointmentCompletedEvent extends DomainEvent<AppointmentCompletedPayload> {
  constructor(appointmentId: string, organizationId: string, customerId: string) {
    super('appointment.completed', organizationId, { appointmentId, organizationId, customerId });
  }
}
