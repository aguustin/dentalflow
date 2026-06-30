import { PlanEntity, PlanName } from '../entities/plan.entity';

export interface IPlanRepository {
  findById(id: string): Promise<PlanEntity | null>;
  findByName(name: PlanName): Promise<PlanEntity | null>;
  findAllActive(): Promise<PlanEntity[]>;
}
