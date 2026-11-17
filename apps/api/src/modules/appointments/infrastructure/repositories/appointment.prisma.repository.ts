import { Injectable } from '@nestjs/common';
import { AppointmentStatus as PrismaStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  IAppointmentRepository,
  FindAppointmentsOptions,
  OverlapCheckRange,
  OverlapParticipants,
} from '../../domain/repositories/appointment.repository.interface';
import { AppointmentEntity } from '../../domain/entities/appointment.entity';
import { AppointmentMapper } from '../mappers/appointment.mapper';
import { DomainError } from '../../../../shared/contracts/errors/domain.error';

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
      ...(options?.customerId ? { customerId: options.customerId } : {}),
      ...(options?.staffId ? { staffId: options.staffId } : {}),
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
    participants: OverlapParticipants,
    organizationId: string,
    range: OverlapCheckRange,
    excludeId?: string,
  ): Promise<AppointmentEntity[]> {
    const or: Prisma.AppointmentWhereInput[] = [];
    if (participants.customerId) or.push({ customerId: participants.customerId });
    if (participants.staffId) or.push({ staffId: participants.staffId });
    if (participants.resourceId) or.push({ resourceId: participants.resourceId });
    if (or.length === 0) return [];

    // Overlap: existing.startTime < range.endTime AND existing.endTime > range.startTime
    const rows = await this.prisma.appointment.findMany({
      where: {
        OR: or,
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
    const row = await this.prisma.appointment
      .create({
        data: {
          id: entity.id,
          organizationId: entity.organizationId,
          customerId: entity.customerId,
          staffId: entity.staffId,
          resourceId: entity.resourceId,
          serviceId: entity.serviceId,
          title: entity.title,
          description: entity.description,
          startTime: entity.timeRange.startTime,
          endTime: entity.timeRange.endTime,
          status: entity.status.value as PrismaStatus,
        },
      })
      .catch(rethrowDoubleBooking);
    return AppointmentMapper.toDomain(row);
  }

  async save(entity: AppointmentEntity): Promise<AppointmentEntity> {
    const row = await this.prisma.appointment
      .update({
        where: { id: entity.id },
        data: {
          staffId: entity.staffId,
          resourceId: entity.resourceId,
          serviceId: entity.serviceId,
          title: entity.title,
          description: entity.description,
          startTime: entity.timeRange.startTime,
          endTime: entity.timeRange.endTime,
          status: entity.status.value as PrismaStatus,
          updatedAt: entity.updatedAt,
        },
      })
      .catch(rethrowDoubleBooking);
    return AppointmentMapper.toDomain(row);
  }
}

/**
 * The DB exclusion constraints (appointments_staff_no_overlap / _resource_no_overlap)
 * reject double bookings that slip past the app-level check (concurrent requests).
 * Postgres reports them as SQLSTATE 23P01 — or, when both inserts wait on each other to
 * check the constraint, as a deadlock (40P01) where it aborts one. Same outcome: one wins.
 */
function rethrowDoubleBooking(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('23P01') || message.includes('_no_overlap')) {
    throw new DomainError('CONFLICT', 'The time slot was just booked by someone else', {
      reason: 'double_booking',
    });
  }
  if (message.includes('40P01')) {
    throw new DomainError('CONFLICT', 'Someone else is booking this time slot right now. Try again.', {
      reason: 'double_booking',
    });
  }
  throw err;
}
