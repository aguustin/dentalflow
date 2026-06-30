import { Inject, Injectable } from '@nestjs/common';
import { IPatientRepository } from '../../domain/repositories/patient.repository.interface';
import { PATIENT_REPOSITORY_TOKEN } from '../../patients.tokens';
import { ListPatientsFilters, ListPatientsResult, toPatientDto } from '../dtos/patient.dto';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

@Injectable()
export class ListPatientsUseCase {
  constructor(
    @Inject(PATIENT_REPOSITORY_TOKEN)
    private readonly patientRepository: IPatientRepository,
  ) {}

  async execute(organizationId: string, filters?: ListPatientsFilters): Promise<ListPatientsResult> {
    const limit = Math.min(filters?.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const offset = Math.max(filters?.offset ?? 0, 0);

    const { items, total } = await this.patientRepository.findAll(organizationId, {
      name: filters?.name,
      limit,
      offset,
    });

    return {
      items: items.map(toPatientDto),
      total,
      limit,
      offset,
    };
  }
}
