import { UsageRecordEntity, UsageRecordEntityProps } from '../../domain/entities/usage-record.entity';
import { BillingMetric } from '../../domain/value-objects/billing-metric.vo';

interface UsageRecordRow {
  id: string;
  organizationId: string;
  metric: string;
  count: number;
  period: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UsageRecordMapper {
  static toDomain(row: UsageRecordRow): UsageRecordEntity {
    const props: UsageRecordEntityProps = {
      id: row.id,
      organizationId: row.organizationId,
      metric: row.metric as BillingMetric,
      count: row.count,
      period: row.period,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    return UsageRecordEntity.reconstitute(props);
  }
}
