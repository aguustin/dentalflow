import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BILLING_TOKENS } from '../../billing.tokens';
import { IPlanRepository } from '../../domain/repositories/plan.repository.interface';
import { ISubscriptionRepository } from '../../domain/repositories/subscription.repository.interface';
import { SubscriptionUpgradedEvent } from '../../domain/events/subscription-upgraded.event';
import { PlanName } from '../../domain/entities/plan.entity';
import { IEventBus } from '../../../../shared/types/event-bus.interface';
import { TOKENS } from '../../../../shared/injection-tokens';
import { ChangePlanCommand, SubscriptionDto, toSubscriptionDto } from '../dtos/billing.dto';

@Injectable()
export class ChangePlanUseCase {
  constructor(
    @Inject(BILLING_TOKENS.PLAN_REPOSITORY)
    private readonly planRepository: IPlanRepository,
    @Inject(BILLING_TOKENS.SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: ISubscriptionRepository,
    @Inject(TOKENS.EVENT_BUS)
    private readonly eventBus: IEventBus,
  ) {}

  async execute(command: ChangePlanCommand): Promise<SubscriptionDto> {
    const subscription = await this.subscriptionRepository.findByOrganizationId(
      command.organizationId,
    );
    if (!subscription) {
      throw new NotFoundException('No subscription found for this organization');
    }
    if (!subscription.isActive()) {
      throw new BadRequestException('Cannot change plan on an inactive subscription');
    }
    if (subscription.planName === command.newPlanName) {
      throw new BadRequestException(`Organization is already on the '${command.newPlanName}' plan`);
    }

    const newPlan = await this.planRepository.findByName(command.newPlanName as PlanName);
    if (!newPlan || !newPlan.isActive) {
      throw new NotFoundException(`Plan '${command.newPlanName}' not found or inactive`);
    }

    const previousPlanId = subscription.planId;
    const previousPlanName = subscription.planName;

    const updated = subscription.changePlan(newPlan.id, newPlan.name);
    const saved = await this.subscriptionRepository.save(updated);

    await this.eventBus.publish(
      new SubscriptionUpgradedEvent(
        saved.id,
        saved.organizationId,
        previousPlanId,
        previousPlanName,
        newPlan.id,
        newPlan.name,
      ),
    );

    return toSubscriptionDto(saved);
  }
}
