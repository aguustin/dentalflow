import { OnboardingResult, CurrentOrganizationDto, UpdateOrganizationResult } from '../../application/dtos/onboarding.dto';

export class OrganizationOnboardingResponse {
  organization: {
    id: string;
    name: string;
    slug: string;
    vertical: string;
    enabledModules: string[];
    isActive: boolean;
    createdAt: string;
  };
  owner: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  subscription: {
    planName: string;
    status: string;
    startDate: string;
  };
  loginHint: {
    endpoint: string;
    organizationSlug: string;
    email: string;
  };

  static from(result: OnboardingResult): OrganizationOnboardingResponse {
    const res = new OrganizationOnboardingResponse();
    res.organization = {
      id: result.organization.id,
      name: result.organization.name,
      slug: result.organization.slug,
      vertical: result.organization.vertical,
      enabledModules: result.organization.enabledModules,
      isActive: result.organization.isActive,
      createdAt: result.organization.createdAt.toISOString(),
    };
    res.owner = {
      id: result.owner.id,
      email: result.owner.email,
      firstName: result.owner.firstName,
      lastName: result.owner.lastName,
    };
    res.subscription = {
      planName: result.subscription.planName,
      status: result.subscription.status,
      startDate: result.subscription.startDate.toISOString(),
    };
    res.loginHint = {
      endpoint: 'POST /api/v1/auth/login',
      organizationSlug: result.organization.slug,
      email: result.owner.email,
    };
    return res;
  }
}

export class CurrentOrganizationResponse {
  id: string;
  name: string;
  slug: string;
  vertical: CurrentOrganizationDto['vertical'];
  enabledModules: string[];
  isActive: boolean;
  createdAt: string;
  subscription: {
    planName: string;
    status: string;
    startDate: string;
  } | null;

  static from(dto: CurrentOrganizationDto): CurrentOrganizationResponse {
    const res = new CurrentOrganizationResponse();
    res.id = dto.id;
    res.name = dto.name;
    res.slug = dto.slug;
    res.vertical = dto.vertical;
    res.enabledModules = dto.enabledModules;
    res.isActive = dto.isActive;
    res.createdAt = dto.createdAt.toISOString();
    res.subscription = dto.subscription
      ? {
          planName: dto.subscription.planName,
          status: dto.subscription.status,
          startDate: dto.subscription.startDate.toISOString(),
        }
      : null;
    return res;
  }
}

export class UpdateOrganizationResponse {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  updatedAt: string;

  static from(result: UpdateOrganizationResult): UpdateOrganizationResponse {
    const res = new UpdateOrganizationResponse();
    res.id = result.id;
    res.name = result.name;
    res.slug = result.slug;
    res.isActive = result.isActive;
    res.updatedAt = result.updatedAt.toISOString();
    return res;
  }
}
