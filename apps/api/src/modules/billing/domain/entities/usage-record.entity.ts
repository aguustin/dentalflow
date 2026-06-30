import { BillingMetric } from '../value-objects/billing-metric.vo';

export interface UsageRecordEntityProps {
  id: string;
  organizationId: string;
  metric: BillingMetric;
  count: number;
  period: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UsageRecordEntity {
  public readonly id: string;
  public readonly organizationId: string;
  public readonly metric: BillingMetric;
  public readonly count: number;
  public readonly period: string;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: UsageRecordEntityProps) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.metric = props.metric;
    this.count = props.count;
    this.period = props.period;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static reconstitute(props: UsageRecordEntityProps): UsageRecordEntity {
    return new UsageRecordEntity(props);
  }

  static currentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
