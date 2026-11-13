import { Module } from '@nestjs/common';
import { ClinicalController } from './clinical.controller';
import { ClinicalService } from './clinical.service';

/** Dental vertical: anamnesis, progress notes and odontogram. */
@Module({
  controllers: [ClinicalController],
  providers: [ClinicalService],
})
export class ClinicalModule {}
