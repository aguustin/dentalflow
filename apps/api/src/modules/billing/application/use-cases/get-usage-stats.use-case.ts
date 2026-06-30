import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BILLING_TOKENS } from '../../billing.tokens';
import { IPlanRepository } from '../../domain/repositories/plan.repository.interface';
import { ISubscriptionRepository } from '../../domain/repositories/subscription.repository.interface';
import { IUsageRepository } from '../../domain/repositories/usage-record.repository.interface';
import { PlanName } from '../../domain/entities/plan.entity';
import { UsageRecordEntity } from '../../domain/entities/usage-record.entity';
import { BILLING_METRICS } from '../../domain/value-objects/billing-metric.vo';
import {
  UsageStatsDto,
  UsageMetricDto,
  toUsageMetricDto,
} from '../dtos/billing.dto';

@Injectable()
export class GetUsageStatsUseCase {
  constructor(
    @Inject(BILLING_TOKENS.PLAN_REPOSITORY)
    private readonly planRepository: IPlanRepository,
    @Inject(BILLING_TOKENS.SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: ISubscriptionRepository,
    @Inject(BILLING_TOKENS.USAGE_REPOSITORY)
    private readonly usageRepository: IUsageRepository,
  ) {}

  async execute(organizationId: string, period?: string): Promise<UsageStatsDto> {
    const subscription = await this.subscriptionRepository.findByOrganizationId(organizationId);
    if (!subscription) {
      throw new NotFoundException('No subscription found for this organization');
    }

    const plan = await this.planRepository.findByName(subscription.planName as PlanName);
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    const effectivePeriod = period ?? UsageRecordEntity.currentPeriod();
    const usageRecords = await this.usageRepository.findAllForOrganization(
      organizationId,
      effectivePeriod,
    );

    const recordByMetric = new Map(usageRecords.map((r) => [r.metric, r]));

    const metrics: UsageMetricDto[] = BILLING_METRICS.map((metric) => {
      const record = recordByMetric.get(metric);
      const limit = plan.limits.getLimit(metric);
      const count = record?.count ?? 0;

      return record
        ? toUsageMetricDto(record, limit)
        : { metric, count, limit, percentUsed: limit === -1 ? null : 0 };
    });

    return {
      organizationId,
      period: effectivePeriod,
      plan: { name: plan.name, status: subscription.status.value },
      metrics,
    };
  }
}
