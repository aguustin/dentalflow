import { BillingMetric } from '../value-objects/billing-metric.vo';
import { UsageRecordEntity } from '../entities/usage-record.entity';

export interface IUsageRepository {
  findByMetricAndPeriod(
    organizationId: string,
    metric: BillingMetric,
    period: string,
  ): Promise<UsageRecordEntity | null>;

  findAllForOrganization(
    organizationId: string,
    period: string,
  ): Promise<UsageRecordEntity[]>;

  increment(
    organizationId: string,
    metric: BillingMetric,
    period: string,
  ): Promise<UsageRecordEntity>;
}
