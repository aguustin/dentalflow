import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { IPatientRepository } from '../../domain/repositories/patient.repository.interface';
import { PATIENT_REPOSITORY_TOKEN } from '../../patients.tokens';

@Injectable()
export class PatientValidationService {
  constructor(
    @Inject(PATIENT_REPOSITORY_TOKEN)
    private readonly patientRepository: IPatientRepository,
  ) {}

  async assertDocumentIdUniqueInOrg(
    documentId: string,
    organizationId: string,
    excludePatientId?: string,
  ): Promise<void> {
    const existing = await this.patientRepository.findByDocumentId(documentId, organizationId);
    if (existing && existing.id !== excludePatientId) {
      throw new ConflictException(
        `A patient with document '${documentId}' already exists in this organization`,
      );
    }
  }
}
