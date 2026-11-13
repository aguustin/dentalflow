import { VerticalTemplate } from '../../../../shared/verticals';

/** Vertical template as exposed to clients (internal role templates omitted). */
export type PublicVerticalDto = Omit<VerticalTemplate, 'roles'>;

// ─── Onboarding command ────────────────────────────────────────────────────────

export interface OnboardingCommand {
  organizationName: string;
  slug: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerPassword: string;
  /** Defaults to 'free' when omitted */
  planName?: string;
  /** Business vertical key. Defaults to DEFAULT_VERTICAL when omitted */
  vertical?: string;
  /** IANA time zone (e.g. from the browser). Defaults to America/Argentina/Buenos_Aires */
  timezone?: string;
}

// ─── Onboarding result ─────────────────────────────────────────────────────────

export interface OnboardingOrganizationDto {
  id: string;
  name: string;
  slug: string;
  vertical: string;
  enabledModules: string[];
  isActive: boolean;
  createdAt: Date;
}

export interface OnboardingOwnerDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface OnboardingSubscriptionDto {
  planName: string;
  status: string;
  startDate: Date;
}

export interface OnboardingResult {
  organization: OnboardingOrganizationDto;
  owner: OnboardingOwnerDto;
  subscription: OnboardingSubscriptionDto;
}

// ─── Current organization ─────────────────────────────────────────────────────

export interface CurrentOrganizationDto {
  id: string;
  name: string;
  slug: string;
  /** Full vertical template (modules, terminology, attribute schema) for clients */
  vertical: PublicVerticalDto;
  enabledModules: string[];
  timezone: string;
  isActive: boolean;
  createdAt: Date;
  subscription: {
    planName: string;
    status: string;
    startDate: Date;
  } | null;
}

// ─── Update command ────────────────────────────────────────────────────────────

export interface UpdateOrganizationCommand {
  id: string;
  organizationId: string;
  name?: string;
  slug?: string;
}

export interface UpdateOrganizationResult {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  updatedAt: Date;
}
