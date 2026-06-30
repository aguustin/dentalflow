import { DomainEvent } from '../../../../domain/events/domain-event.base';

interface FeatureBlockedPayload {
  organizationId: string;
  feature: string;
  planName: string;
  reason: 'FEATURE_NOT_IN_PLAN';
}

export class FeatureBlockedEvent extends DomainEvent<FeatureBlockedPayload> {
  constructor(organizationId: string, feature: string, planName: string) {
    super('billing.feature_blocked', organizationId, {
      organizationId,
      feature,
      planName,
      reason: 'FEATURE_NOT_IN_PLAN',
    });
  }
}
