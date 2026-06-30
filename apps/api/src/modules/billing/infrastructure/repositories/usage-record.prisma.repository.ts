import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { IUsageRepository } from '../../domain/repositories/usage-record.repository.interface';
import { BillingMetric } from '../../domain/value-objects/billing-metric.vo';
import { UsageRecordEntity } from '../../domain/entities/usage-record.entity';
import { UsageRecordMapper } from '../mappers/usage-record.mapper';

@Injectable()
export class UsageRecordPrismaRepository implements IUsageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByMetricAndPeriod(
    organizationId: string,
    metric: BillingMetric,
    period: string,
  ): Promise<UsageRecordEntity | null> {
    const row = await this.prisma.usageRecord.findUnique({
      where: { organizationId_metric_period: { organizationId, metric, period } },
    });
    return row ? UsageRecordMapper.toDomain(row) : null;
  }

  async findAllForOrganization(
    organizationId: string,
    period: string,
  ): Promise<UsageRecordEntity[]> {
    const rows = await this.prisma.usageRecord.findMany({
      where: { organizationId, period },
    });
    return rows.map(UsageRecordMapper.toDomain);
  }

  async increment(
    organizationId: string,
    metric: BillingMetric,
    period: string,
  ): Promise<UsageRecordEntity> {
    const row = await this.prisma.usageRecord.upsert({
      where: { organizationId_metric_period: { organizationId, metric, period } },
      create: { organizationId, metric, count: 1, period },
      update: { count: { increment: 1 } },
    });
    return UsageRecordMapper.toDomain(row);
  }
}
