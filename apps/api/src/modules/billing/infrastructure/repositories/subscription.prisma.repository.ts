import { Injectable } from '@nestjs/common';
import { SubscriptionStatus as PrismaSubStatus } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  ISubscriptionRepository,
  CreateSubscriptionData,
} from '../../domain/repositories/subscription.repository.interface';
import { SubscriptionEntity } from '../../domain/entities/subscription.entity';
import { SubscriptionMapper } from '../mappers/subscription.mapper';

const INCLUDE_PLAN = { plan: true } as const;

@Injectable()
export class SubscriptionPrismaRepository implements ISubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOrganizationId(organizationId: string): Promise<SubscriptionEntity | null> {
    const row = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: INCLUDE_PLAN,
    });
    return row ? SubscriptionMapper.toDomain(row) : null;
  }

  async create(data: CreateSubscriptionData): Promise<SubscriptionEntity> {
    const row = await this.prisma.subscription.create({
      data: {
        id: data.id,
        organizationId: data.organizationId,
        planId: data.planId,
        status: PrismaSubStatus.ACTIVE,
        startDate: data.startDate,
      },
      include: INCLUDE_PLAN,
    });
    return SubscriptionMapper.toDomain(row);
  }

  async save(entity: SubscriptionEntity): Promise<SubscriptionEntity> {
    const row = await this.prisma.subscription.update({
      where: { organizationId: entity.organizationId },
      data: {
        planId: entity.planId,
        status: entity.status.value as PrismaSubStatus,
        endDate: entity.endDate,
        updatedAt: entity.updatedAt,
      },
      include: INCLUDE_PLAN,
    });
    return SubscriptionMapper.toDomain(row);
  }
}
