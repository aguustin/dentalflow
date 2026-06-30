import { FeatureLimits } from '../value-objects/feature-limits.vo';
import { BillingMetric } from '../value-objects/billing-metric.vo';

export const PLAN_NAMES = ['free', 'pro', 'enterprise'] as const;
export type PlanName = (typeof PLAN_NAMES)[number];

export interface PlanEntityProps {
  id: string;
  name: PlanName;
  displayName: string;
  price: number;
  currency: string;
  features: string[];
  limits: FeatureLimits;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class PlanEntity {
  public readonly id: string;
  public readonly name: PlanName;
  public readonly displayName: string;
  public readonly price: number;
  public readonly currency: string;
  public readonly features: string[];
  public readonly limits: FeatureLimits;
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: PlanEntityProps) {
    this.id = props.id;
    this.name = props.name;
    this.displayName = props.displayName;
    this.price = props.price;
    this.currency = props.currency;
    this.features = props.features;
    this.limits = props.limits;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static reconstitute(props: PlanEntityProps): PlanEntity {
    return new PlanEntity(props);
  }

  hasFeature(featureKey: string): boolean {
    return this.features.includes(featureKey);
  }

  isLimitExceeded(metric: BillingMetric, currentCount: number): boolean {
    return this.limits.isExceeded(metric, currentCount);
  }
}
