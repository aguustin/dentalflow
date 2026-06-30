import { BillingMetric } from './billing-metric.vo';

export const UNLIMITED = -1;

export class FeatureLimits {
  constructor(
    public readonly maxPatients: number,
    public readonly maxAppointments: number,
  ) {}

  static unlimited(): FeatureLimits {
    return new FeatureLimits(UNLIMITED, UNLIMITED);
  }

  getLimit(metric: BillingMetric): number {
    switch (metric) {
      case 'patients':
        return this.maxPatients;
      case 'appointments':
        return this.maxAppointments;
    }
  }

  isUnlimited(metric: BillingMetric): boolean {
    return this.getLimit(metric) === UNLIMITED;
  }

  isExceeded(metric: BillingMetric, currentCount: number): boolean {
    const limit = this.getLimit(metric);
    return limit !== UNLIMITED && currentCount >= limit;
  }
}
