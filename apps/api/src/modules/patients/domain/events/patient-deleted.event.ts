import { DomainEvent } from '../../../../domain/events/domain-event.base';

interface PatientDeletedPayload {
  patientId: string;
  organizationId: string;
}

export class PatientDeletedEvent extends DomainEvent<PatientDeletedPayload> {
  constructor(patientId: string, organizationId: string) {
    super('patient.deleted', organizationId, { patientId, organizationId });
  }
}
