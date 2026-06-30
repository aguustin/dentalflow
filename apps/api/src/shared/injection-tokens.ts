export const TOKENS = {
  USER_REPOSITORY: Symbol('IUserRepository'),
  ORGANIZATION_REPOSITORY: Symbol('IOrganizationRepository'),
  MEMBERSHIP_REPOSITORY: Symbol('IMembershipRepository'),
  ROLE_REPOSITORY: Symbol('IRoleRepository'),
  PERMISSION_REPOSITORY: Symbol('IPermissionRepository'),
  REFRESH_TOKEN_REPOSITORY: Symbol('IRefreshTokenRepository'),
  EVENT_BUS: Symbol('IEventBus'),
} as const;
