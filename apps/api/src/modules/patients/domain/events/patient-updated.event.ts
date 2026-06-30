import { DomainEvent } from '../../../../domain/events/domain-event.base';

interface PatientUpdatedPayload {
  patientId: string;
  organizationId: string;
  name: string;
}

export class PatientUpdatedEvent extends DomainEvent<PatientUpdatedPayload> {
  constructor(patientId: string, organizationId: string, name: string) {
    super('patient.updated', organizationId, { patientId, organizationId, name });
  }
}
