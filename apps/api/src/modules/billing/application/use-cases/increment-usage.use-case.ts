import { Inject, Injectable, Logger } from '@nestjs/common';
import { BILLING_TOKENS } from '../../billing.tokens';
import { IUsageRepository } from '../../domain/repositories/usage-record.repository.interface';
import { BillingMetric } from '../../domain/value-objects/billing-metric.vo';
import { UsageRecordEntity } from '../../domain/entities/usage-record.entity';

@Injectable()
export class IncrementUsageUseCase {
  private readonly logger = new Logger(IncrementUsageUseCase.name);

  constructor(
    @Inject(BILLING_TOKENS.USAGE_REPOSITORY)
    private readonly usageRepository: IUsageRepository,
  ) {}

  async execute(organizationId: string, metric: BillingMetric): Promise<void> {
    const period = UsageRecordEntity.currentPeriod();

    try {
      // Increment current month period and all-time period atomically
      await Promise.all([
        this.usageRepository.increment(organizationId, metric, period),
        this.usageRepository.increment(organizationId, metric, 'all-time'),
      ]);
    } catch (err) {
      // Usage tracking must never block the primary operation
      this.logger.error(
        `Failed to increment usage for org=${organizationId} metric=${metric}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
