import { Module } from '@nestjs/common';
import { PATIENT_REPOSITORY_TOKEN } from './patients.tokens';
import { PatientPrismaRepository } from './infrastructure/repositories/patient.prisma.repository';
import { PatientValidationService } from './application/services/patient-validation.service';
import { CreatePatientUseCase } from './application/use-cases/create-patient.use-case';
import { GetPatientUseCase } from './application/use-cases/get-patient.use-case';
import { UpdatePatientUseCase } from './application/use-cases/update-patient.use-case';
import { DeletePatientUseCase } from './application/use-cases/delete-patient.use-case';
import { ListPatientsUseCase } from './application/use-cases/list-patients.use-case';
import { PatientsController } from './api/controllers/patients.controller';

@Module({
  controllers: [PatientsController],
  providers: [
    { provide: PATIENT_REPOSITORY_TOKEN, useClass: PatientPrismaRepository },
    PatientValidationService,
    CreatePatientUseCase,
    GetPatientUseCase,
    UpdatePatientUseCase,
    DeletePatientUseCase,
    ListPatientsUseCase,
  ],
})
export class PatientsModule {}
