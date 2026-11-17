import { Module } from '@nestjs/common';
import { FILE_STORAGE, LocalDiskStorage } from '../../infrastructure/storage/file-storage';
import { ClinicalController } from './clinical.controller';
import { ClinicalService } from './clinical.service';
import { AttachmentsService } from './attachments.service';
import { TreatmentPlansService } from './treatment-plans.service';
import { AttachmentsController, TreatmentPlansController } from './treatments.controller';

/** Dental vertical: anamnesis, progress notes, odontogram, treatment plans and attachments. */
@Module({
  controllers: [ClinicalController, TreatmentPlansController, AttachmentsController],
  providers: [
    ClinicalService,
    TreatmentPlansService,
    AttachmentsService,
    { provide: FILE_STORAGE, useClass: LocalDiskStorage },
  ],
})
export class ClinicalModule {}
