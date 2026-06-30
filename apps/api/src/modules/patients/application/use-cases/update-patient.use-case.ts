import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IPatientRepository } from '../../domain/repositories/patient.repository.interface';
import { PatientUpdatedEvent } from '../../domain/events/patient-updated.event';
import { IEventBus } from '../../../../shared/types/event-bus.interface';
import { TOKENS } from '../../../../shared/injection-tokens';
import { PATIENT_REPOSITORY_TOKEN } from '../../patients.tokens';
import { UpdatePatientCommand, PatientDto, toPatientDto } from '../dtos/patient.dto';
import { PatientValidationService } from '../services/patient-validation.service';

@Injectable()
export class UpdatePatientUseCase {
  constructor(
    @Inject(PATIENT_REPOSITORY_TOKEN)
    private readonly patientRepository: IPatientRepository,
    @Inject(TOKENS.EVENT_BUS)
    private readonly eventBus: IEventBus,
    private readonly validationService: PatientValidationService,
  ) {}

  async execute(
    id: string,
    organizationId: string,
    command: UpdatePatientCommand,
  ): Promise<PatientDto> {
    const existing = await this.patientRepository.findById(id, organizationId);
    if (!existing) throw new NotFoundException('Patient not found');

    if (command.documentId && command.documentId !== existing.documentId) {
      await this.validationService.assertDocumentIdUniqueInOrg(
        command.documentId,
        organizationId,
        id,
      );
    }

    const updated = await this.patientRepository.update(id, organizationId, command);
    if (!updated) throw new NotFoundException('Patient not found');

    await this.eventBus.publish(
      new PatientUpdatedEvent(id, organizationId, updated.name.getValue()),
    );

    return toPatientDto(updated);
  }
}
