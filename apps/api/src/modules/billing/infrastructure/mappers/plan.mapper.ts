import { PlanEntity, PlanEntityProps, PlanName } from '../../domain/entities/plan.entity';
import { FeatureLimits } from '../../domain/value-objects/feature-limits.vo';

interface PlanRow {
  id: string;
  name: string;
  displayName: string;
  price: { toNumber(): number } | number;
  currency: string;
  features: string[];
  maxCustomers: number;
  maxAppointments: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class PlanMapper {
  static toDomain(row: PlanRow): PlanEntity {
    const props: PlanEntityProps = {
      id: row.id,
      name: row.name as PlanName,
      displayName: row.displayName,
      price: typeof row.price === 'number' ? row.price : row.price.toNumber(),
      currency: row.currency,
      features: row.features,
      limits: new FeatureLimits(row.maxCustomers, row.maxAppointments),
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    return PlanEntity.reconstitute(props);
  }
}
