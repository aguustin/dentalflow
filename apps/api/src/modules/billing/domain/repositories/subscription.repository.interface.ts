import { SubscriptionEntity } from '../entities/subscription.entity';

export interface CreateSubscriptionData {
  id: string;
  organizationId: string;
  planId: string;
  planName: string;
  startDate: Date;
}

export interface ISubscriptionRepository {
  findByOrganizationId(organizationId: string): Promise<SubscriptionEntity | null>;
  create(data: CreateSubscriptionData): Promise<SubscriptionEntity>;
  save(entity: SubscriptionEntity): Promise<SubscriptionEntity>;
}
