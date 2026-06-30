import { DomainEvent } from '../../../../domain/events/domain-event.base';

interface SubscriptionCreatedPayload {
  subscriptionId: string;
  organizationId: string;
  planId: string;
  planName: string;
}

export class SubscriptionCreatedEvent extends DomainEvent<SubscriptionCreatedPayload> {
  constructor(subscriptionId: string, organizationId: string, planId: string, planName: string) {
    super('subscription.created', organizationId, {
      subscriptionId,
      organizationId,
      planId,
      planName,
    });
  }
}
