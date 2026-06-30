import { Injectable } from '@nestjs/common';
import { AppointmentStatus as PrismaStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  IAppointmentRepository,
  FindAppointmentsOptions,
  OverlapCheckRange,
} from '../../domain/repositories/appointment.repository.interface';
import { AppointmentEntity } from '../../domain/entities/appointment.entity';
import { AppointmentMapper } from '../mappers/appointment.mapper';

// Only active (non-terminal) appointments block a time slot
const ACTIVE_STATUSES: PrismaStatus[] = [PrismaStatus.SCHEDULED, PrismaStatus.CONFIRMED];

@Injectable()
export class AppointmentPrismaRepository implements IAppointmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, organizationId: string): Promise<AppointmentEntity | null> {
    const row = await this.prisma.appointment.findFirst({ where: { id, organizationId } });
    return row ? AppointmentMapper.toDomain(row) : null;
  }

  async findAll(
    organizationId: string,
    options?: FindAppointmentsOptions,
  ): Promise<{ items: AppointmentEntity[]; total: number }> {
    const limit = Math.min(options?.limit ?? 20, 100);
    const offset = options?.offset ?? 0;

    const where: Prisma.AppointmentWhereInput = {
      organizationId,
      ...(options?.patientId ? { patientId: options.patientId } : {}),
      ...(options?.status ? { status: options.status as PrismaStatus } : {}),
      ...(options?.startAfter || options?.startBefore
        ? {
            startTime: {
              ...(options.startAfter ? { gte: options.startAfter } : {}),
              ...(options.startBefore ? { lte: options.startBefore } : {}),
            },
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { startTime: 'asc' },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return { items: rows.map(AppointmentMapper.toDomain), total };
  }

  async findOverlapping(
    patientId: string,
    organizationId: string,
    range: OverlapCheckRange,
    excludeId?: string,
  ): Promise<AppointmentEntity[]> {
    // Overlap: existing.startTime < range.endTime AND existing.endTime > range.startTime
    const rows = await this.prisma.appointment.findMany({
      where: {
        patientId,
        organizationId,
        status: { in: ACTIVE_STATUSES },
        startTime: { lt: range.endTime },
        endTime: { gt: range.startTime },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    return rows.map(AppointmentMapper.toDomain);
  }

  async create(entity: AppointmentEntity): Promise<AppointmentEntity> {
    const row = await this.prisma.appointment.create({
      data: {
        id: entity.id,
        organizationId: entity.organizationId,
        patientId: entity.patientId,
        title: entity.title,
        description: entity.description,
        startTime: entity.timeRange.startTime,
        endTime: entity.timeRange.endTime,
        status: entity.status.value as PrismaStatus,
      },
    });
    return AppointmentMapper.toDomain(row);
  }

  async save(entity: AppointmentEntity): Promise<AppointmentEntity> {
    const row = await this.prisma.appointment.update({
      where: { id: entity.id },
      data: {
        title: entity.title,
        description: entity.description,
        startTime: entity.timeRange.startTime,
        endTime: entity.timeRange.endTime,
        status: entity.status.value as PrismaStatus,
        updatedAt: entity.updatedAt,
      },
    });
    return AppointmentMapper.toDomain(row);
  }
}
