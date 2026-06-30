export const BILLING_METRICS = ['patients', 'appointments'] as const;
export type BillingMetric = (typeof BILLING_METRICS)[number];

export function isBillingMetric(value: string): value is BillingMetric {
  return BILLING_METRICS.includes(value as BillingMetric);
}
