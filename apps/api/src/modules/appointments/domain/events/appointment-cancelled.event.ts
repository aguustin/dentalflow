import { DomainEvent } from '../../../../domain/events/domain-event.base';

interface AppointmentCancelledPayload {
  appointmentId: string;
  organizationId: string;
  customerId: string;
}

export class AppointmentCancelledEvent extends DomainEvent<AppointmentCancelledPayload> {
  constructor(appointmentId: string, organizationId: string, customerId: string) {
    super('appointment.cancelled', organizationId, { appointmentId, organizationId, customerId });
  }
}
