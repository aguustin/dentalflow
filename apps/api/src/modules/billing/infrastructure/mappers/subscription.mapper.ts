import {
  SubscriptionEntity,
  SubscriptionEntityProps,
} from '../../domain/entities/subscription.entity';
import { SubscriptionStatus } from '../../domain/value-objects/subscription-status.vo';

interface SubscriptionRow {
  id: string;
  organizationId: string;
  planId: string;
  plan: { name: string };
  status: string;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class SubscriptionMapper {
  static toDomain(row: SubscriptionRow): SubscriptionEntity {
    const props: SubscriptionEntityProps = {
      id: row.id,
      organizationId: row.organizationId,
      planId: row.planId,
      planName: row.plan.name,
      status: SubscriptionStatus.fromString(row.status),
      startDate: row.startDate,
      endDate: row.endDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    return SubscriptionEntity.reconstitute(props);
  }
}
