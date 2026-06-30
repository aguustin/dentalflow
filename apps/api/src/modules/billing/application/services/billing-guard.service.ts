import { Inject, Injectable } from '@nestjs/common';
import { BILLING_TOKENS } from '../../billing.tokens';
import { IPlanRepository } from '../../domain/repositories/plan.repository.interface';
import { ISubscriptionRepository } from '../../domain/repositories/subscription.repository.interface';
import { IUsageRepository } from '../../domain/repositories/usage-record.repository.interface';
import { SubscriptionEntity } from '../../domain/entities/subscription.entity';
import { PlanEntity, PlanName } from '../../domain/entities/plan.entity';
import { BillingMetric } from '../../domain/value-objects/billing-metric.vo';
import { UsageRecordEntity } from '../../domain/entities/usage-record.entity';
import { BillingCheckResult } from '../dtos/billing.dto';

/**
 * BillingGuardService — application-layer feature gating pipeline.
 *
 * This service does NOT throw HTTP exceptions. It returns structured results
 * that the BillingGuard (API layer) converts to HTTP errors. This keeps the
 * application layer free of framework dependencies.
 *
 * Pipeline order:
 *   1. Verify active subscription exists
 *   2. Verify feature is included in plan
 *   3. Verify usage has not exceeded plan limit
 */
@Injectable()
export class BillingGuardService {
  constructor(
    @Inject(BILLING_TOKENS.PLAN_REPOSITORY)
    private readonly planRepository: IPlanRepository,
    @Inject(BILLING_TOKENS.SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: ISubscriptionRepository,
    @Inject(BILLING_TOKENS.USAGE_REPOSITORY)
    private readonly usageRepository: IUsageRepository,
  ) {}

  async getActiveSubscription(organizationId: string): Promise<SubscriptionEntity | null> {
    const sub = await this.subscriptionRepository.findByOrganizationId(organizationId);
    return sub?.isActive() ? sub : null;
  }

  async getPlanForOrg(organizationId: string): Promise<PlanEntity | null> {
    const sub = await this.subscriptionRepository.findByOrganizationId(organizationId);
    if (!sub?.isActive()) return null;
    return this.planRepository.findByName(sub.planName as PlanName);
  }

  /**
   * Full gating pipeline: subscription → feature → usage.
   */
  async checkAccess(
    organizationId: string,
    featureKey: string,
    metric?: BillingMetric,
  ): Promise<BillingCheckResult> {
    // Step 1: Active subscription
    const subscription = await this.subscriptionRepository.findByOrganizationId(organizationId);
    if (!subscription || !subscription.isActive()) {
      return {
        allowed: false,
        reason: 'NO_ACTIVE_SUBSCRIPTION',
        detail: 'Organization has no active subscription',
      };
    }

    // Step 2: Feature access
    const plan = await this.planRepository.findByName(subscription.planName as PlanName);
    if (!plan || !plan.hasFeature(featureKey)) {
      return {
        allowed: false,
        reason: 'FEATURE_NOT_IN_PLAN',
        detail: `Feature '${featureKey}' is not available in plan '${subscription.planName}'`,
      };
    }

    // Step 3: Usage limit (only when a metric is specified)
    if (metric) {
      if (plan.limits.isUnlimited(metric)) {
        return { allowed: true };
      }

      const period = UsageRecordEntity.currentPeriod();
      const usage = await this.usageRepository.findByMetricAndPeriod(
        organizationId,
        metric,
        period,
      );
      const currentCount = usage?.count ?? 0;
      const limit = plan.limits.getLimit(metric);

      if (plan.limits.isExceeded(metric, currentCount)) {
        return {
          allowed: false,
          reason: 'USAGE_LIMIT_REACHED',
          detail: `Usage limit of ${limit} for '${metric}' reached (current: ${currentCount})`,
        };
      }
    }

    return { allowed: true };
  }
}
