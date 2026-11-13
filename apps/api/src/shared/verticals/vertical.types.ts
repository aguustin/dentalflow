/**
 * Business verticals: each organization belongs to one vertical (dental, repair, retail…).
 * A vertical is a static template, defined in code — not stored in the database.
 * The API is the single source of truth; clients read it via GET /organizations/current.
 */

/** Feature modules that can be enabled per organization. Add keys only when the module exists. */
export const MODULE_KEYS = ['customers', 'scheduling'] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];

export type AttributeFieldType = 'text' | 'number' | 'date' | 'select' | 'boolean';

export interface AttributeField {
  key: string;
  label: string;
  type: AttributeFieldType;
  required?: boolean;
  /** Only for type 'select' */
  options?: string[];
}

export interface Terminology {
  singular: string;
  plural: string;
}

export interface VerticalRoleTemplate {
  name: string;
  /** Permission keys in 'resource.action' format (see permission-catalog.ts) */
  permissions: string[];
}

export interface VerticalTemplate {
  key: string;
  label: string;
  modules: ModuleKey[];
  /** Module the client opens by default after login */
  homeModule: ModuleKey;
  terminology: {
    customer: Terminology;
    appointment: Terminology;
  };
  /** Extra fields stored in Customer.attributes */
  customerAttributes: AttributeField[];
  /** Roles created on onboarding in addition to 'admin' (which always gets every permission) */
  roles: VerticalRoleTemplate[];
}
