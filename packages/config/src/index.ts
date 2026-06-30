/**
 * @dentalflow/config
 *
 * Shared constants and configuration values used across all apps.
 * No secrets, no runtime env reads — pure static values only.
 *
 * Planned modules:
 *
 *   src/
 *     api.config.ts      API base paths, version prefix
 *     roles.config.ts    Role/permission constants
 *     limits.config.ts   Business rule limits (max files, etc.)
 *     locales.config.ts  Supported locales, default timezone
 *     routes.config.ts   Shared route name constants
 */

export const APP_NAME = 'DentalFlow' as const
export const API_VERSION = 'v1' as const
export const API_PREFIX = `api/${API_VERSION}` as const
