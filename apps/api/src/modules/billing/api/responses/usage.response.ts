import { UsageStatsDto } from '../../application/dtos/billing.dto';

export class UsageResponse {
  organizationId: string;
  period: string;
  plan: { name: string; status: string };
  metrics: Array<{
    metric: string;
    count: number;
    limit: number;
    percentUsed: number | null;
  }>;

  static from(dto: UsageStatsDto): UsageResponse {
    const res = new UsageResponse();
    res.organizationId = dto.organizationId;
    res.period = dto.period;
    res.plan = dto.plan;
    res.metrics = dto.metrics.map((m) => ({
      metric: m.metric,
      count: m.count,
      limit: m.limit,
      percentUsed: m.percentUsed,
    }));
    return res;
  }
}
