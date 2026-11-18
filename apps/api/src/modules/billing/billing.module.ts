import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BILLING_TOKENS } from './billing.tokens';
import { PlanPrismaRepository } from './infrastructure/repositories/plan.prisma.repository';
import { SubscriptionPrismaRepository } from './infrastructure/repositories/subscription.prisma.repository';
import { UsageRecordPrismaRepository } from './infrastructure/repositories/usage-record.prisma.repository';
import { BillingEventSubscriber } from './infrastructure/event-handlers/billing-event-subscriber';
import { BillingGuardService } from './application/services/billing-guard.service';
import { CreateSubscriptionUseCase } from './application/use-cases/create-subscription.use-case';
import { ChangePlanUseCase } from './application/use-cases/change-plan.use-case';
import { CancelSubscriptionUseCase } from './application/use-cases/cancel-subscription.use-case';
import { CheckFeatureAccessUseCase } from './application/use-cases/check-feature-access.use-case';
import { IncrementUsageUseCase } from './application/use-cases/increment-usage.use-case';
import { GetUsageStatsUseCase } from './application/use-cases/get-usage-stats.use-case';
import { GetSubscriptionUseCase } from './application/use-cases/get-subscription.use-case';
import { BillingController } from './api/billing.controller';
import { BillingGuard } from './api/guards/billing.guard';
import { MercadoPagoWebhookController, SubscriptionPaymentsController } from './api/subscription-payments.controller';
import { SubscriptionPaymentsService } from './application/subscription-payments.service';
import { PAYMENT_GATEWAY } from './application/payment-gateway.interface';
import { MercadoPagoGateway } from './infrastructure/mercadopago.gateway';

@Module({
  controllers: [BillingController, SubscriptionPaymentsController, MercadoPagoWebhookController],
  providers: [
    // Repositories
    { provide: BILLING_TOKENS.PLAN_REPOSITORY, useClass: PlanPrismaRepository },
    { provide: BILLING_TOKENS.SUBSCRIPTION_REPOSITORY, useClass: SubscriptionPrismaRepository },
    { provide: BILLING_TOKENS.USAGE_REPOSITORY, useClass: UsageRecordPrismaRepository },

    // Application services
    BillingGuardService,
    SubscriptionPaymentsService,
    { provide: PAYMENT_GATEWAY, useClass: MercadoPagoGateway },

    // Use cases
    CreateSubscriptionUseCase,
    ChangePlanUseCase,
    CancelSubscriptionUseCase,
    CheckFeatureAccessUseCase,
    IncrementUsageUseCase,
    GetUsageStatsUseCase,
    GetSubscriptionUseCase,

    // Event subscriber
    BillingEventSubscriber,

    // Guard registered as APP_GUARD (self-registration, runs after JWT+Permissions)
    { provide: APP_GUARD, useClass: BillingGuard },
  ],
  exports: [BillingGuardService],
})
export class BillingModule {}
