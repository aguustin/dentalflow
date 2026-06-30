import { DomainEvent } from '../../../../domain/events/domain-event.base';

interface PatientCreatedPayload {
  patientId: string;
  organizationId: string;
  name: string;
}

export class PatientCreatedEvent extends DomainEvent<PatientCreatedPayload> {
  constructor(patientId: string, organizationId: string, name: string) {
    super('patient.created', organizationId, { patientId, organizationId, name });
  }
}
