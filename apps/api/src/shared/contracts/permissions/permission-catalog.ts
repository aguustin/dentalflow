/**
 * Centralized registry of all permissions in the DentalFlow platform.
 *
 * Every @RequirePermissions() decorator call MUST reference a value from
 * this catalog. Adding a new permission requires:
 *   1. Adding it to PERMISSION_CATALOG below
 *   2. Adding it to the seed file (prisma/seed.ts)
 *   3. Assigning it to the appropriate roles in the seed
 *
 * Format: RESOURCE.ACTION (dot-notation, lowercase)
 */
export const PERMISSION_CATALOG = {
  USERS: {
    CREATE: 'users.create',
    READ: 'users.read',
    UPDATE: 'users.update',
    DELETE: 'users.delete',
  },
  ORGANIZATIONS: {
    MANAGE: 'organizations.manage',
  },
  ROLES: {
    CREATE: 'roles.create',
    ASSIGN: 'roles.assign',
  },
  PERMISSIONS: {
    READ: 'permissions.read',
    MANAGE: 'permissions.manage',
  },
  CUSTOMERS: {
    CREATE: 'customers.create',
    READ: 'customers.read',
    UPDATE: 'customers.update',
    DELETE: 'customers.delete',
  },
  APPOINTMENTS: {
    CREATE: 'appointments.create',
    READ: 'appointments.read',
    UPDATE: 'appointments.update',
    DELETE: 'appointments.delete',
  },
  STAFF: {
    CREATE: 'staff.create',
    READ: 'staff.read',
    UPDATE: 'staff.update',
  },
  CATALOG: {
    CREATE: 'catalog.create',
    READ: 'catalog.read',
    UPDATE: 'catalog.update',
  },
  SALES: {
    CREATE: 'sales.create',
    READ: 'sales.read',
    UPDATE: 'sales.update',
  },
  INVENTORY: {
    READ: 'inventory.read',
    UPDATE: 'inventory.update',
  },
  CLINICAL: {
    READ: 'clinical.read',
    UPDATE: 'clinical.update',
  },
  WORK_ORDERS: {
    CREATE: 'work_orders.create',
    READ: 'work_orders.read',
    UPDATE: 'work_orders.update',
  },
  BILLING: {
    CREATE: 'billing.create',
    READ: 'billing.read',
    UPDATE: 'billing.update',
    DELETE: 'billing.delete',
  },
} as const;

export type Permission =
  (typeof PERMISSION_CATALOG)[keyof typeof PERMISSION_CATALOG][keyof (typeof PERMISSION_CATALOG)[keyof typeof PERMISSION_CATALOG]];
