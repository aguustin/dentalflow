import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { BILLING_TOKENS } from '../../billing.tokens';
import { IPlanRepository } from '../../domain/repositories/plan.repository.interface';
import { ISubscriptionRepository } from '../../domain/repositories/subscription.repository.interface';
import { SubscriptionCreatedEvent } from '../../domain/events/subscription-created.event';
import { SubscriptionEntity } from '../../domain/entities/subscription.entity';
import { SubscriptionStatus } from '../../domain/value-objects/subscription-status.vo';
import { PlanName } from '../../domain/entities/plan.entity';
import { IEventBus } from '../../../../shared/types/event-bus.interface';
import { TOKENS } from '../../../../shared/injection-tokens';
import { CreateSubscriptionCommand, SubscriptionDto, toSubscriptionDto } from '../dtos/billing.dto';

@Injectable()
export class CreateSubscriptionUseCase {
  constructor(
    @Inject(BILLING_TOKENS.PLAN_REPOSITORY)
    private readonly planRepository: IPlanRepository,
    @Inject(BILLING_TOKENS.SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: ISubscriptionRepository,
    @Inject(TOKENS.EVENT_BUS)
    private readonly eventBus: IEventBus,
  ) {}

  async execute(command: CreateSubscriptionCommand): Promise<SubscriptionDto> {
    const existing = await this.subscriptionRepository.findByOrganizationId(command.organizationId);

    if (existing && existing.isActive()) {
      throw new ConflictException(
        `Organization already has an active subscription on the '${existing.planName}' plan`,
      );
    }

    const plan = await this.planRepository.findByName(command.planName as PlanName);
    if (!plan || !plan.isActive) {
      throw new NotFoundException(`Plan '${command.planName}' not found or inactive`);
    }

    let subscription: SubscriptionEntity;

    if (existing && existing.status.isCanceled()) {
      // Re-subscription after cancellation: reactivate with new plan
      const recovered = SubscriptionEntity.reconstitute({
        id: existing.id,
        organizationId: existing.organizationId,
        planId: plan.id,
        planName: plan.name,
        status: SubscriptionStatus.active(),
        startDate: new Date(),
        endDate: null,
        createdAt: existing.createdAt,
        updatedAt: new Date(),
      });
      subscription = await this.subscriptionRepository.save(recovered);
    } else {
      subscription = await this.subscriptionRepository.create({
        id: randomUUID(),
        organizationId: command.organizationId,
        planId: plan.id,
        planName: plan.name,
        startDate: new Date(),
      });
    }

    await this.eventBus.publish(
      new SubscriptionCreatedEvent(
        subscription.id,
        subscription.organizationId,
        subscription.planId,
        subscription.planName,
      ),
    );

    return toSubscriptionDto(subscription);
  }
}
