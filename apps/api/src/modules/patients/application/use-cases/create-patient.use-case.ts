import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IPatientRepository } from '../../domain/repositories/patient.repository.interface';
import { PatientCreatedEvent } from '../../domain/events/patient-created.event';
import { IEventBus } from '../../../../shared/types/event-bus.interface';
import { TOKENS } from '../../../../shared/injection-tokens';
import { PATIENT_REPOSITORY_TOKEN } from '../../patients.tokens';
import { CreatePatientCommand, PatientDto, toPatientDto } from '../dtos/patient.dto';
import { PatientValidationService } from '../services/patient-validation.service';

@Injectable()
export class CreatePatientUseCase {
  constructor(
    @Inject(PATIENT_REPOSITORY_TOKEN)
    private readonly patientRepository: IPatientRepository,
    @Inject(TOKENS.EVENT_BUS)
    private readonly eventBus: IEventBus,
    private readonly validationService: PatientValidationService,
  ) {}

  async execute(command: CreatePatientCommand): Promise<PatientDto> {
    if (command.documentId) {
      await this.validationService.assertDocumentIdUniqueInOrg(
        command.documentId,
        command.organizationId,
      );
    }

    const patient = await this.patientRepository.create({
      id: randomUUID(),
      organizationId: command.organizationId,
      name: command.name,
      email: command.email ?? null,
      phone: command.phone ?? null,
      documentId: command.documentId ?? null,
    });

    await this.eventBus.publish(
      new PatientCreatedEvent(patient.id, patient.organizationId, patient.name.getValue()),
    );

    return toPatientDto(patient);
  }
}
