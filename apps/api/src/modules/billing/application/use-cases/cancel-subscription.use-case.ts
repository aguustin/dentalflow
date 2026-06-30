import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BILLING_TOKENS } from '../../billing.tokens';
import { ISubscriptionRepository } from '../../domain/repositories/subscription.repository.interface';
import { SubscriptionCanceledEvent } from '../../domain/events/subscription-canceled.event';
import { IEventBus } from '../../../../shared/types/event-bus.interface';
import { TOKENS } from '../../../../shared/injection-tokens';
import { SubscriptionDto, toSubscriptionDto } from '../dtos/billing.dto';

@Injectable()
export class CancelSubscriptionUseCase {
  constructor(
    @Inject(BILLING_TOKENS.SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: ISubscriptionRepository,
    @Inject(TOKENS.EVENT_BUS)
    private readonly eventBus: IEventBus,
  ) {}

  async execute(organizationId: string): Promise<SubscriptionDto> {
    const subscription = await this.subscriptionRepository.findByOrganizationId(organizationId);
    if (!subscription) {
      throw new NotFoundException('No subscription found for this organization');
    }

    let canceled: typeof subscription;
    try {
      canceled = subscription.cancel();
    } catch (err: unknown) {
      throw new BadRequestException(err instanceof Error ? err.message : String(err));
    }

    const saved = await this.subscriptionRepository.save(canceled);

    await this.eventBus.publish(
      new SubscriptionCanceledEvent(saved.id, saved.organizationId, saved.planName),
    );

    return toSubscriptionDto(saved);
  }
}
