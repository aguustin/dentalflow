import { PatientEntity } from '../../domain/entities/patient.entity';

interface PatientRow {
  id: string;
  organizationId: string;
  name: string;
  email: string | null;
  phone: string | null;
  documentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PatientMapper {
  static toDomain(row: PatientRow): PatientEntity {
    return PatientEntity.create({
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      email: row.email,
      phone: row.phone,
      documentId: row.documentId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
