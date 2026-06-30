import { PatientEntity } from '../../domain/entities/patient.entity';

export interface PatientDto {
  id: string;
  organizationId: string;
  name: string;
  email: string | null;
  phone: string | null;
  documentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePatientCommand {
  organizationId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  documentId?: string | null;
}

export interface UpdatePatientCommand {
  name?: string;
  email?: string | null;
  phone?: string | null;
  documentId?: string | null;
}

export interface ListPatientsFilters {
  name?: string;
  limit?: number;
  offset?: number;
}

export interface ListPatientsResult {
  items: PatientDto[];
  total: number;
  limit: number;
  offset: number;
}

export function toPatientDto(entity: PatientEntity): PatientDto {
  return {
    id: entity.id,
    organizationId: entity.organizationId,
    name: entity.name.getValue(),
    email: entity.contact.email,
    phone: entity.contact.phone,
    documentId: entity.documentId,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
