import { PlanEntity } from '../../domain/entities/plan.entity';
import { SubscriptionEntity } from '../../domain/entities/subscription.entity';
import { UsageRecordEntity } from '../../domain/entities/usage-record.entity';
import { BillingMetric } from '../../domain/value-objects/billing-metric.vo';

// ─── Plan DTO ────────────────────────────────────────────────────────────────

export interface PlanDto {
  id: string;
  name: string;
  displayName: string;
  price: number;
  currency: string;
  features: string[];
  maxPatients: number;
  maxAppointments: number;
}

export function toPlanDto(entity: PlanEntity): PlanDto {
  return {
    id: entity.id,
    name: entity.name,
    displayName: entity.displayName,
    price: entity.price,
    currency: entity.currency,
    features: entity.features,
    maxPatients: entity.limits.maxPatients,
    maxAppointments: entity.limits.maxAppointments,
  };
}

// ─── Subscription DTO ────────────────────────────────────────────────────────

export interface SubscriptionDto {
  id: string;
  organizationId: string;
  planId: string;
  planName: string;
  status: string;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toSubscriptionDto(entity: SubscriptionEntity): SubscriptionDto {
  return {
    id: entity.id,
    organizationId: entity.organizationId,
    planId: entity.planId,
    planName: entity.planName,
    status: entity.status.value,
    startDate: entity.startDate,
    endDate: entity.endDate,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

// ─── Usage DTO ───────────────────────────────────────────────────────────────

export interface UsageMetricDto {
  metric: BillingMetric;
  count: number;
  limit: number;
  percentUsed: number | null;
}

export interface UsageStatsDto {
  organizationId: string;
  period: string;
  plan: { name: string; status: string };
  metrics: UsageMetricDto[];
}

export function toUsageMetricDto(
  entity: UsageRecordEntity,
  limit: number,
): UsageMetricDto {
  const percentUsed = limit === -1 ? null : Math.round((entity.count / limit) * 100);
  return {
    metric: entity.metric,
    count: entity.count,
    limit,
    percentUsed,
  };
}

// ─── Command types ────────────────────────────────────────────────────────────

export interface CreateSubscriptionCommand {
  organizationId: string;
  planName: string;
}

export interface ChangePlanCommand {
  organizationId: string;
  newPlanName: string;
}

// ─── Feature check result ─────────────────────────────────────────────────────

export type BillingBlockReason =
  | 'NO_ACTIVE_SUBSCRIPTION'
  | 'FEATURE_NOT_IN_PLAN'
  | 'USAGE_LIMIT_REACHED';

export interface BillingCheckResult {
  allowed: boolean;
  reason?: BillingBlockReason;
  detail?: string;
}
