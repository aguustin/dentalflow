import { DomainError } from '../../../../shared/contracts/errors/domain.error';
import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IOrganizationRepository } from '../../../../domain/repositories/organization.repository.interface';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IMembershipRepository } from '../../../../domain/repositories/membership.repository.interface';
import { IRoleRepository } from '../../../../domain/repositories/role.repository.interface';
import { IPermissionRepository } from '../../../../domain/repositories/permission.repository.interface';
import { IPlanRepository } from '../../../billing/domain/repositories/plan.repository.interface';
import { ISubscriptionRepository } from '../../../billing/domain/repositories/subscription.repository.interface';
import { IEventBus } from '../../../../shared/types/event-bus.interface';
import { TOKENS } from '../../../../shared/injection-tokens';
import { ONBOARDING_TOKENS } from '../../organizations.tokens';
import { hashPassword, verifyPassword } from '../../../../shared/utils/hash.util';
import { OrganizationCreatedEvent } from '../../../../domain/events/organization-created.event';
import { MembershipCreatedEvent } from '../../../../domain/events/membership-created.event';
import { OwnerAssignedEvent } from '../../domain/events/owner-assigned.event';
import { OrganizationInitializedEvent } from '../../domain/events/organization-initialized.event';
import { OnboardingCommand, OnboardingResult } from '../dtos/onboarding.dto';
import { PlanName } from '../../../billing/domain/entities/plan.entity';
import { DEFAULT_VERTICAL, getVertical } from '../../../../shared/verticals';

@Injectable()
export class CreateOrganizationOnboardingUseCase {
  private readonly logger = new Logger(CreateOrganizationOnboardingUseCase.name);

  constructor(
    @Inject(TOKENS.ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
    @Inject(TOKENS.USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    @Inject(TOKENS.MEMBERSHIP_REPOSITORY)
    private readonly membershipRepo: IMembershipRepository,
    @Inject(TOKENS.ROLE_REPOSITORY)
    private readonly roleRepo: IRoleRepository,
    @Inject(TOKENS.PERMISSION_REPOSITORY)
    private readonly permissionRepo: IPermissionRepository,
    @Inject(ONBOARDING_TOKENS.PLAN_REPOSITORY)
    private readonly planRepo: IPlanRepository,
    @Inject(ONBOARDING_TOKENS.SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(TOKENS.EVENT_BUS)
    private readonly eventBus: IEventBus,
  ) {}

  async execute(command: OnboardingCommand): Promise<OnboardingResult> {
    // ── Step 0: Paid plans are contracted after sign-up, by paying (POST /billing/checkout)
    if (command.planName && command.planName !== 'free') {
      throw new DomainError('INVALID', 'New organizations start on the free plan; subscribe to a paid plan after signing up');
    }

    // ── Step 1: Validate slug uniqueness ──────────────────────────────────────
    if (await this.orgRepo.existsBySlug(command.slug)) {
      throw new ConflictException(`Organization slug '${command.slug}' is already taken`);
    }

    // ── Step 1b: An existing user can own a new org only with their own password ─
    // Prevents attaching someone else's account as owner, and avoids creating an
    // org whose owner then cannot log in with the password just typed.
    const existingUser = await this.userRepo.findByEmail(command.ownerEmail);
    if (
      existingUser &&
      !(await verifyPassword(command.ownerPassword, existingUser.passwordHash))
    ) {
      throw new ConflictException(
        'This email is already registered. Use your current password to create another organization.',
      );
    }

    // ── Step 2: Create organization from its vertical template ────────────────
    const vertical = getVertical(command.vertical ?? DEFAULT_VERTICAL);
    const org = await this.orgRepo.create({
      id: randomUUID(),
      name: command.organizationName,
      slug: command.slug,
      vertical: vertical.key,
      enabledModules: [...vertical.modules],
      timezone: command.timezone,
    });
    this.logger.log(`Organization created: ${org.slug} (${org.id})`);

    // ── Step 3: Bootstrap admin role ──────────────────────────────────────────
    const adminRole = await this.roleRepo.create({
      id: randomUUID(),
      name: 'admin',
      organizationId: org.id,
    });

    // ── Step 4: Create or fetch owner user ────────────────────────────────────
    let ownerUser = existingUser;
    if (!ownerUser) {
      const passwordHash = await hashPassword(command.ownerPassword);
      ownerUser = await this.userRepo.create({
        id: randomUUID(),
        email: command.ownerEmail,
        passwordHash,
        firstName: command.ownerFirstName,
        lastName: command.ownerLastName,
      });
    }

    // ── Step 5: Create owner membership ──────────────────────────────────────
    const membership = await this.membershipRepo.create({
      id: randomUUID(),
      userId: ownerUser.id,
      organizationId: org.id,
      roleId: adminRole.id,
    });

    // ── Step 6: Assign ALL platform permissions to admin role ─────────────────
    const allPermissions = await this.permissionRepo.findAll();
    await Promise.all(
      allPermissions.map((p) => this.permissionRepo.assignToRole(adminRole.id, p.id)),
    );
    this.logger.log(
      `${allPermissions.length} permissions assigned to admin role in org ${org.slug}`,
    );

    // ── Step 6b: Create the vertical's default roles ──────────────────────────
    const permissionByKey = new Map(allPermissions.map((p) => [p.key, p]));
    for (const template of vertical.roles) {
      const role = await this.roleRepo.create({
        id: randomUUID(),
        name: template.name,
        organizationId: org.id,
      });
      await Promise.all(
        template.permissions
          .map((key) => permissionByKey.get(key))
          .filter((p): p is NonNullable<typeof p> => !!p)
          .map((p) => this.permissionRepo.assignToRole(role.id, p.id)),
      );
    }

    // ── Step 7: Initialize billing subscription ───────────────────────────────
    const planName = (command.planName ?? 'free') as PlanName;
    const plan = await this.planRepo.findByName(planName);
    if (!plan) {
      throw new InternalServerErrorException(
        `Billing plan '${planName}' not found — ensure the database is seeded`,
      );
    }

    const subscription = await this.subscriptionRepo.create({
      id: randomUUID(),
      organizationId: org.id,
      planId: plan.id,
      planName: plan.name,
      startDate: new Date(),
    });
    this.logger.log(`Subscription initialized: plan=${plan.name} org=${org.slug}`);

    // ── Step 8: Emit domain events ────────────────────────────────────────────
    await this.eventBus.publish(new OrganizationCreatedEvent(org.id, org.slug));
    await this.eventBus.publish(
      new MembershipCreatedEvent(membership.id, ownerUser.id, org.id, adminRole.id),
    );
    await this.eventBus.publish(
      new OwnerAssignedEvent(org.id, ownerUser.id, adminRole.id, membership.id),
    );
    await this.eventBus.publish(
      new OrganizationInitializedEvent(org.id, org.slug, ownerUser.id, plan.name),
    );

    return {
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        vertical: org.vertical,
        enabledModules: org.enabledModules,
        isActive: org.isActive,
        createdAt: org.createdAt,
      },
      owner: {
        id: ownerUser.id,
        email: ownerUser.email,
        firstName: ownerUser.firstName,
        lastName: ownerUser.lastName,
      },
      subscription: {
        planName: plan.name,
        status: subscription.status.value,
        startDate: subscription.startDate,
      },
    };
  }
}
