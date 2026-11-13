import { Module } from '@nestjs/common';
import { ONBOARDING_TOKENS } from './organizations.tokens';

// Infrastructure — local billing repo providers (scoped to this module)
import { OnboardingPlanPrismaRepository } from './infrastructure/repositories/plan-readonly.prisma.repository';
import { OnboardingSubscriptionPrismaRepository } from './infrastructure/repositories/subscription-create.prisma.repository';
import { OrganizationManagementPrismaRepository } from './infrastructure/repositories/organization-management.prisma.repository';

// Application
import { CreateOrganizationOnboardingUseCase } from './application/use-cases/create-organization-onboarding.use-case';
import { GetCurrentOrganizationUseCase } from './application/use-cases/get-current-organization.use-case';
import { UpdateOrganizationUseCase } from './application/use-cases/update-organization.use-case';

// API
import { OrganizationsOnboardingController } from './api/controllers/organizations-onboarding.controller';
import { VerticalsController } from './api/controllers/verticals.controller';

/**
 * OrganizationOnboardingModule — Platform entry point.
 *
 * Orchestrates the full organization initialization flow:
 *   1. Create organization + slug
 *   2. Bootstrap admin role
 *   3. Create/link owner user
 *   4. Assign owner membership
 *   5. Assign ALL permissions to admin role
 *   6. Initialize FREE billing subscription
 *   7. Emit OrganizationCreated + OwnerAssigned + OrganizationInitialized events
 *
 * Cross-module integration:
 *   - Uses global TOKENS (org, user, membership, role, permission repos) via RepositoriesModule
 *   - Locally provides billing repos (plan, subscription) — no BillingModule import needed
 *   - Uses global TOKENS.EVENT_BUS from EventBusModule
 *
 * This module must be imported in AppModule BEFORE OrganizationsModule (core)
 * so that POST /organizations registers the onboarding flow as the primary handler.
 */
@Module({
  controllers: [OrganizationsOnboardingController, VerticalsController],
  providers: [
    // ── Local billing repo providers ────────────────────────────────────────
    // These are scoped to this module. The same Prisma implementations are
    // used as in BillingModule but under separate DI tokens so they don't
    // conflict. PrismaService is provided globally via PrismaModule.
    {
      provide: ONBOARDING_TOKENS.PLAN_REPOSITORY,
      useClass: OnboardingPlanPrismaRepository,
    },
    {
      provide: ONBOARDING_TOKENS.SUBSCRIPTION_REPOSITORY,
      useClass: OnboardingSubscriptionPrismaRepository,
    },
    {
      provide: ONBOARDING_TOKENS.ORGANIZATION_MANAGEMENT_REPOSITORY,
      useClass: OrganizationManagementPrismaRepository,
    },

    // ── Use cases ───────────────────────────────────────────────────────────
    CreateOrganizationOnboardingUseCase,
    GetCurrentOrganizationUseCase,
    UpdateOrganizationUseCase,
  ],
})
export class OrganizationOnboardingModule {}
