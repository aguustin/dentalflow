import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { IPlanRepository } from '../../domain/repositories/plan.repository.interface';
import { PlanEntity, PlanName } from '../../domain/entities/plan.entity';
import { PlanMapper } from '../mappers/plan.mapper';

@Injectable()
export class PlanPrismaRepository implements IPlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PlanEntity | null> {
    const row = await this.prisma.plan.findUnique({ where: { id } });
    return row ? PlanMapper.toDomain(row) : null;
  }

  async findByName(name: PlanName): Promise<PlanEntity | null> {
    const row = await this.prisma.plan.findUnique({ where: { name } });
    return row ? PlanMapper.toDomain(row) : null;
  }

  async findAllActive(): Promise<PlanEntity[]> {
    const rows = await this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
    return rows.map(PlanMapper.toDomain);
  }
}
