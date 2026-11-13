import { PrismaClient } from '@prisma/client';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const prisma = new PrismaClient();
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}

const CORE_PERMISSIONS = [
  { resource: 'users', action: 'create' },
  { resource: 'users', action: 'read' },
  { resource: 'users', action: 'update' },
  { resource: 'users', action: 'delete' },
  { resource: 'organizations', action: 'manage' },
  { resource: 'roles', action: 'create' },
  { resource: 'roles', action: 'assign' },
  { resource: 'permissions', action: 'read' },
  { resource: 'permissions', action: 'manage' },
  // Dental domain placeholders (no logic — just permission definitions)
  { resource: 'customers', action: 'create' },
  { resource: 'customers', action: 'read' },
  { resource: 'customers', action: 'update' },
  { resource: 'customers', action: 'delete' },
  { resource: 'appointments', action: 'create' },
  { resource: 'appointments', action: 'read' },
  { resource: 'appointments', action: 'update' },
  { resource: 'appointments', action: 'delete' },
  { resource: 'staff', action: 'create' },
  { resource: 'staff', action: 'read' },
  { resource: 'staff', action: 'update' },
  { resource: 'catalog', action: 'create' },
  { resource: 'catalog', action: 'read' },
  { resource: 'catalog', action: 'update' },
  { resource: 'sales', action: 'create' },
  { resource: 'sales', action: 'read' },
  { resource: 'sales', action: 'update' },
  { resource: 'inventory', action: 'read' },
  { resource: 'inventory', action: 'update' },
  { resource: 'clinical', action: 'read' },
  { resource: 'clinical', action: 'update' },
  { resource: 'billing', action: 'create' },
  { resource: 'billing', action: 'read' },
  { resource: 'billing', action: 'update' },
  { resource: 'billing', action: 'delete' },
];

async function main() {
  console.log('Seeding database...');

  // 1. Upsert all core permissions
  const createdPermissions: Record<string, string> = {};
  for (const perm of CORE_PERMISSIONS) {
    const p = await prisma.permission.upsert({
      where: { resource_action: { resource: perm.resource, action: perm.action } },
      create: { resource: perm.resource, action: perm.action },
      update: {},
    });
    createdPermissions[`${perm.resource}.${perm.action}`] = p.id;
  }
  console.log(`✓ ${CORE_PERMISSIONS.length} permissions seeded`);

  // 2. Create demo organization
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-clinic' },
    create: { name: 'Demo Clinic', slug: 'demo-clinic', vertical: 'dental', enabledModules: ['customers', 'scheduling', 'catalog', 'sales', 'inventory', 'clinical'] },
    update: {},
  });
  console.log(`✓ Organization: ${org.name} (${org.slug})`);

  // 3. Create admin role for the org
  const adminRole = await prisma.role.upsert({
    where: { name_organizationId: { name: 'admin', organizationId: org.id } },
    create: { name: 'admin', organizationId: org.id },
    update: {},
  });

  // 4. Assign ALL permissions to admin role
  for (const permId of Object.values(createdPermissions)) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permId } },
      create: { roleId: adminRole.id, permissionId: permId },
      update: {},
    });
  }
  console.log(`✓ Admin role seeded with all permissions`);

  // 5. Create viewer role with read-only permissions
  const viewerRole = await prisma.role.upsert({
    where: { name_organizationId: { name: 'viewer', organizationId: org.id } },
    create: { name: 'viewer', organizationId: org.id },
    update: {},
  });
  const readPermKeys = ['users.read', 'customers.read', 'appointments.read', 'permissions.read', 'staff.read', 'catalog.read', 'sales.read', 'inventory.read'];
  for (const key of readPermKeys) {
    const permId = createdPermissions[key];
    if (permId) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: viewerRole.id, permissionId: permId } },
        create: { roleId: viewerRole.id, permissionId: permId },
        update: {},
      });
    }
  }
  console.log(`✓ Viewer role seeded`);

  // 6. Create demo admin user
  const adminPasswordHash = await hashPassword('admin1234');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo-clinic.com' },
    create: {
      email: 'admin@demo-clinic.com',
      passwordHash: adminPasswordHash,
      firstName: 'Admin',
      lastName: 'Demo',
    },
    update: {},
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: adminUser.id, organizationId: org.id } },
    create: { userId: adminUser.id, organizationId: org.id, roleId: adminRole.id },
    update: {},
  });
  console.log(`✓ Admin user: admin@demo-clinic.com / admin1234`);

  // 7. Create demo viewer user
  const viewerPasswordHash = await hashPassword('viewer1234');
  const viewerUser = await prisma.user.upsert({
    where: { email: 'viewer@demo-clinic.com' },
    create: {
      email: 'viewer@demo-clinic.com',
      passwordHash: viewerPasswordHash,
      firstName: 'Viewer',
      lastName: 'Demo',
    },
    update: {},
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: viewerUser.id, organizationId: org.id } },
    create: { userId: viewerUser.id, organizationId: org.id, roleId: viewerRole.id },
    update: {},
  });
  console.log(`✓ Viewer user: viewer@demo-clinic.com / viewer1234`);

  // 8. Seed billing plans
  const PLANS = [
    {
      name: 'free',
      displayName: 'Free',
      price: 0,
      currency: 'USD',
      features: ['customers', 'appointments'],
      maxCustomers: 10,
      maxAppointments: 30,
    },
    {
      name: 'pro',
      displayName: 'Pro',
      price: 49,
      currency: 'USD',
      features: ['customers', 'appointments', 'reporting', 'exports'],
      maxCustomers: 500,
      maxAppointments: 2000,
    },
    {
      name: 'enterprise',
      displayName: 'Enterprise',
      price: 199,
      currency: 'USD',
      features: ['customers', 'appointments', 'reporting', 'exports', 'api_access', 'multi_location'],
      maxCustomers: -1,
      maxAppointments: -1,
    },
  ];

  const planIdMap: Record<string, string> = {};
  for (const plan of PLANS) {
    const p = await prisma.plan.upsert({
      where: { name: plan.name },
      create: {
        name: plan.name,
        displayName: plan.displayName,
        price: plan.price,
        currency: plan.currency,
        features: plan.features,
        maxCustomers: plan.maxCustomers,
        maxAppointments: plan.maxAppointments,
        isActive: true,
      },
      update: {
        displayName: plan.displayName,
        price: plan.price,
        features: plan.features,
        maxCustomers: plan.maxCustomers,
        maxAppointments: plan.maxAppointments,
      },
    });
    planIdMap[plan.name] = p.id;
  }
  console.log(`✓ 3 billing plans seeded (free, pro, enterprise)`);

  // 9. Seed demo-clinic subscription on Pro plan (required for E2E tests)
  const { randomUUID } = await import('crypto');
  await prisma.subscription.upsert({
    where: { organizationId: org.id },
    create: {
      id: randomUUID(),
      organizationId: org.id,
      planId: planIdMap['pro'],
      status: 'ACTIVE',
      startDate: new Date(),
    },
    update: {
      planId: planIdMap['pro'],
      status: 'ACTIVE',
    },
  });
  console.log(`✓ demo-clinic subscription seeded on Pro plan`);

  console.log('\nSeed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
