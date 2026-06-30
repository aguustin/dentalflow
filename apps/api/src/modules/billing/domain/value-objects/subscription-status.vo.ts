export const SUBSCRIPTION_STATUSES = ['ACTIVE', 'PAST_DUE', 'CANCELED'] as const;
export type SubscriptionStatusValue = (typeof SUBSCRIPTION_STATUSES)[number];

export class SubscriptionStatus {
  private constructor(public readonly value: SubscriptionStatusValue) {}

  static active(): SubscriptionStatus {
    return new SubscriptionStatus('ACTIVE');
  }

  static pastDue(): SubscriptionStatus {
    return new SubscriptionStatus('PAST_DUE');
  }

  static canceled(): SubscriptionStatus {
    return new SubscriptionStatus('CANCELED');
  }

  static fromString(value: string): SubscriptionStatus {
    if (!SUBSCRIPTION_STATUSES.includes(value as SubscriptionStatusValue)) {
      throw new Error(`Invalid subscription status: ${value}`);
    }
    return new SubscriptionStatus(value as SubscriptionStatusValue);
  }

  isActive(): boolean {
    return this.value === 'ACTIVE';
  }

  isPastDue(): boolean {
    return this.value === 'PAST_DUE';
  }

  isCanceled(): boolean {
    return this.value === 'CANCELED';
  }
}
