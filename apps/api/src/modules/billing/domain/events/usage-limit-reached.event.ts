import { DomainEvent } from '../../../../domain/events/domain-event.base';

interface UsageLimitReachedPayload {
  organizationId: string;
  metric: string;
  currentCount: number;
  limit: number;
  planName: string;
}

export class UsageLimitReachedEvent extends DomainEvent<UsageLimitReachedPayload> {
  constructor(
    organizationId: string,
    metric: string,
    currentCount: number,
    limit: number,
    planName: string,
  ) {
    super('billing.usage_limit_reached', organizationId, {
      organizationId,
      metric,
      currentCount,
      limit,
      planName,
    });
  }
}
