import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IPatientRepository } from '../../domain/repositories/patient.repository.interface';
import { PATIENT_REPOSITORY_TOKEN } from '../../patients.tokens';
import { PatientDto, toPatientDto } from '../dtos/patient.dto';

@Injectable()
export class GetPatientUseCase {
  constructor(
    @Inject(PATIENT_REPOSITORY_TOKEN)
    private readonly patientRepository: IPatientRepository,
  ) {}

  async execute(id: string, organizationId: string): Promise<PatientDto> {
    const patient = await this.patientRepository.findById(id, organizationId);
    if (!patient) throw new NotFoundException('Patient not found');
    return toPatientDto(patient);
  }
}
