import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  IPatientRepository,
  FindPatientsOptions,
  CreatePatientData,
  UpdatePatientData,
} from '../../domain/repositories/patient.repository.interface';
import { PatientEntity } from '../../domain/entities/patient.entity';
import { PatientMapper } from '../mappers/patient.mapper';

@Injectable()
export class PatientPrismaRepository implements IPatientRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, organizationId: string): Promise<PatientEntity | null> {
    const row = await this.prisma.patient.findFirst({ where: { id, organizationId } });
    return row ? PatientMapper.toDomain(row) : null;
  }

  async findAll(
    organizationId: string,
    options?: FindPatientsOptions,
  ): Promise<{ items: PatientEntity[]; total: number }> {
    const limit = Math.min(options?.limit ?? 20, 100);
    const offset = options?.offset ?? 0;
    const where = {
      organizationId,
      ...(options?.name
        ? { name: { contains: options.name, mode: 'insensitive' as const } }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.patient.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { name: 'asc' },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return { items: rows.map(PatientMapper.toDomain), total };
  }

  async findByDocumentId(documentId: string, organizationId: string): Promise<PatientEntity | null> {
    const row = await this.prisma.patient.findFirst({ where: { documentId, organizationId } });
    return row ? PatientMapper.toDomain(row) : null;
  }

  async create(data: CreatePatientData): Promise<PatientEntity> {
    const row = await this.prisma.patient.create({
      data: {
        id: data.id,
        organizationId: data.organizationId,
        name: data.name,
        email: data.email ?? null,
        phone: data.phone ?? null,
        documentId: data.documentId ?? null,
      },
    });
    return PatientMapper.toDomain(row);
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdatePatientData,
  ): Promise<PatientEntity | null> {
    return this.prisma.$transaction(async (tx) => {
      const exists = await tx.patient.findFirst({ where: { id, organizationId } });
      if (!exists) return null;

      const row = await tx.patient.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.documentId !== undefined && { documentId: data.documentId }),
        },
      });
      return PatientMapper.toDomain(row);
    });
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await this.prisma.patient.deleteMany({ where: { id, organizationId } });
  }
}
