import { DomainEvent } from '../../../../domain/events/domain-event.base';

interface SubscriptionCanceledPayload {
  subscriptionId: string;
  organizationId: string;
  planName: string;
}

export class SubscriptionCanceledEvent extends DomainEvent<SubscriptionCanceledPayload> {
  constructor(subscriptionId: string, organizationId: string, planName: string) {
    super('subscription.canceled', organizationId, {
      subscriptionId,
      organizationId,
      planName,
    });
  }
}
