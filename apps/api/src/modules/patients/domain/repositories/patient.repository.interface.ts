import { PatientEntity } from '../entities/patient.entity';

export interface FindPatientsOptions {
  name?: string;
  limit?: number;
  offset?: number;
}

export interface CreatePatientData {
  id: string;
  organizationId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  documentId?: string | null;
}

export interface UpdatePatientData {
  name?: string;
  email?: string | null;
  phone?: string | null;
  documentId?: string | null;
}

export interface IPatientRepository {
  findById(id: string, organizationId: string): Promise<PatientEntity | null>;
  findAll(
    organizationId: string,
    options?: FindPatientsOptions,
  ): Promise<{ items: PatientEntity[]; total: number }>;
  findByDocumentId(documentId: string, organizationId: string): Promise<PatientEntity | null>;
  create(data: CreatePatientData): Promise<PatientEntity>;
  update(id: string, organizationId: string, data: UpdatePatientData): Promise<PatientEntity | null>;
  delete(id: string, organizationId: string): Promise<void>;
}
