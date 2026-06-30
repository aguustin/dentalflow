import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BILLING_TOKENS } from '../../billing.tokens';
import { ISubscriptionRepository } from '../../domain/repositories/subscription.repository.interface';
import { SubscriptionDto, toSubscriptionDto } from '../dtos/billing.dto';

@Injectable()
export class GetSubscriptionUseCase {
  constructor(
    @Inject(BILLING_TOKENS.SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: ISubscriptionRepository,
  ) {}

  async execute(organizationId: string): Promise<SubscriptionDto> {
    const subscription = await this.subscriptionRepository.findByOrganizationId(organizationId);
    if (!subscription) {
      throw new NotFoundException('No subscription found for this organization');
    }
    return toSubscriptionDto(subscription);
  }
}
