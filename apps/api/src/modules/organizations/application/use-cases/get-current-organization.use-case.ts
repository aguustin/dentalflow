import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IOrganizationRepository } from '../../../../domain/repositories/organization.repository.interface';
import { ISubscriptionRepository } from '../../../billing/domain/repositories/subscription.repository.interface';
import { TOKENS } from '../../../../shared/injection-tokens';
import { ONBOARDING_TOKENS } from '../../organizations.tokens';
import { CurrentOrganizationDto, PublicVerticalDto } from '../dtos/onboarding.dto';
import { getVertical } from '../../../../shared/verticals';

@Injectable()
export class GetCurrentOrganizationUseCase {
  constructor(
    @Inject(TOKENS.ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
    @Inject(ONBOARDING_TOKENS.SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepo: ISubscriptionRepository,
  ) {}

  async execute(organizationId: string): Promise<CurrentOrganizationDto> {
    const org = await this.orgRepo.findById(organizationId);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const subscription = await this.subscriptionRepo.findByOrganizationId(organizationId);

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      vertical: toPublicVertical(org.vertical),
      enabledModules: org.enabledModules,
      timezone: org.timezone,
      isActive: org.isActive,
      createdAt: org.createdAt,
      subscription: subscription
        ? {
            planName: subscription.planName,
            status: subscription.status.value,
            startDate: subscription.startDate,
          }
        : null,
    };
  }
}

function toPublicVertical(key: string): PublicVerticalDto {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { roles, ...rest } = getVertical(key);
  return rest;
}
