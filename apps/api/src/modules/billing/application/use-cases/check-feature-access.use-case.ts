import { Inject, Injectable } from '@nestjs/common';
import { BILLING_TOKENS } from '../../billing.tokens';
import { IPlanRepository } from '../../domain/repositories/plan.repository.interface';
import { ISubscriptionRepository } from '../../domain/repositories/subscription.repository.interface';
import { PlanName } from '../../domain/entities/plan.entity';

export interface FeatureAccessResult {
  organizationId: string;
  feature: string;
  enabled: boolean;
  planName: string | null;
  reason?: string;
}

@Injectable()
export class CheckFeatureAccessUseCase {
  constructor(
    @Inject(BILLING_TOKENS.PLAN_REPOSITORY)
    private readonly planRepository: IPlanRepository,
    @Inject(BILLING_TOKENS.SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: ISubscriptionRepository,
  ) {}

  async execute(organizationId: string, featureKey: string): Promise<FeatureAccessResult> {
    const subscription = await this.subscriptionRepository.findByOrganizationId(organizationId);

    if (!subscription || !subscription.isActive()) {
      return {
        organizationId,
        feature: featureKey,
        enabled: false,
        planName: subscription?.planName ?? null,
        reason: 'No active subscription',
      };
    }

    const plan = await this.planRepository.findByName(subscription.planName as PlanName);
    if (!plan) {
      return {
        organizationId,
        feature: featureKey,
        enabled: false,
        planName: subscription.planName,
        reason: 'Plan not found',
      };
    }

    const enabled = plan.hasFeature(featureKey);
    return {
      organizationId,
      feature: featureKey,
      enabled,
      planName: plan.name,
      reason: enabled ? undefined : `Feature '${featureKey}' not included in plan '${plan.name}'`,
    };
  }
}
