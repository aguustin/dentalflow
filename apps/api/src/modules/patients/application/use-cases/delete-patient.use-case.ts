import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IPatientRepository } from '../../domain/repositories/patient.repository.interface';
import { PatientDeletedEvent } from '../../domain/events/patient-deleted.event';
import { IEventBus } from '../../../../shared/types/event-bus.interface';
import { TOKENS } from '../../../../shared/injection-tokens';
import { PATIENT_REPOSITORY_TOKEN } from '../../patients.tokens';

@Injectable()
export class DeletePatientUseCase {
  constructor(
    @Inject(PATIENT_REPOSITORY_TOKEN)
    private readonly patientRepository: IPatientRepository,
    @Inject(TOKENS.EVENT_BUS)
    private readonly eventBus: IEventBus,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const patient = await this.patientRepository.findById(id, organizationId);
    if (!patient) throw new NotFoundException('Patient not found');

    await this.patientRepository.delete(id, organizationId);

    await this.eventBus.publish(new PatientDeletedEvent(id, organizationId));
  }
}
