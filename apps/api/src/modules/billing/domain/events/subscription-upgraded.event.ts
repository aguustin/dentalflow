import { DomainEvent } from '../../../../domain/events/domain-event.base';

interface SubscriptionUpgradedPayload {
  subscriptionId: string;
  organizationId: string;
  previousPlanId: string;
  previousPlanName: string;
  newPlanId: string;
  newPlanName: string;
}

export class SubscriptionUpgradedEvent extends DomainEvent<SubscriptionUpgradedPayload> {
  constructor(
    subscriptionId: string,
    organizationId: string,
    previousPlanId: string,
    previousPlanName: string,
    newPlanId: string,
    newPlanName: string,
  ) {
    super('subscription.upgraded', organizationId, {
      subscriptionId,
      organizationId,
      previousPlanId,
      previousPlanName,
      newPlanId,
      newPlanName,
    });
  }
}
