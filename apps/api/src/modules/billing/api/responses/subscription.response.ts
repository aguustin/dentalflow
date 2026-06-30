import { SubscriptionDto } from '../../application/dtos/billing.dto';

export class SubscriptionResponse {
  id: string;
  organizationId: string;
  planName: string;
  status: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;

  static from(dto: SubscriptionDto): SubscriptionResponse {
    const res = new SubscriptionResponse();
    res.id = dto.id;
    res.organizationId = dto.organizationId;
    res.planName = dto.planName;
    res.status = dto.status;
    res.startDate = dto.startDate.toISOString();
    res.endDate = dto.endDate?.toISOString() ?? null;
    res.createdAt = dto.createdAt.toISOString();
    return res;
  }
}
