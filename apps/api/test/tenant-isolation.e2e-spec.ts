import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { createTenant, createTestApp, TestTenant } from './helpers';

/**
 * Cross-tenant isolation + module gating.
 *
 * HOW TO EXTEND: when a phase adds endpoints that read/modify org-owned data,
 * create one resource in `beforeAll` (owned by tenant A) and add rows to
 * `crossTenantCases`. No new test blocks needed.
 */
describe('Tenant isolation (e2e)', () => {
  let app: INestApplication;
  let a: TestTenant;
  let b: TestTenant;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenant(app);
    b = await createTenant(app);

    const customer = await a.api().post('/customers').send({ name: 'Customer A' }).expect(201);
    ids.customer = customer.body.id;

    const appointment = await a
      .api()
      .post('/appointments')
      .send({
        customerId: ids.customer,
        title: 'Visit',
        startTime: '2030-01-10T10:00:00.000Z',
        endTime: '2030-01-10T11:00:00.000Z',
      })
      .expect(201);
    ids.appointment = appointment.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // [description, request made by tenant B against tenant A's resources]
  const crossTenantCases: [string, () => ReturnType<ReturnType<TestTenant['api']>['get']>][] = [
    ['GET customer', () => b.api().get(`/customers/${ids.customer}`)],
    ['PUT customer', () => b.api().put(`/customers/${ids.customer}`).send({ name: 'Hacked' })],
    ['DELETE customer', () => b.api().delete(`/customers/${ids.customer}`)],
    ['GET appointment', () => b.api().get(`/appointments/${ids.appointment}`)],
    ['PUT appointment', () => b.api().put(`/appointments/${ids.appointment}`).send({ title: 'Hacked' })],
    ['DELETE appointment', () => b.api().delete(`/appointments/${ids.appointment}`)],
    [
      'POST appointment with foreign customer',
      () =>
        b.api().post('/appointments').send({
          customerId: ids.customer,
          title: 'Visit',
          startTime: '2030-02-10T10:00:00.000Z',
          endTime: '2030-02-10T11:00:00.000Z',
        }),
    ],
  ];

  it.each(crossTenantCases)('%s from another org is rejected', async (_name, call) => {
    const res = await call();
    expect([403, 404]).toContain(res.status);
  });

  it('lists never include other orgs data', async () => {
    const customers = await b.api().get('/customers').expect(200);
    const appointments = await b.api().get('/appointments').expect(200);
    expect(customers.body.items).toHaveLength(0);
    expect(appointments.body.items).toHaveLength(0);
  });

  it('resources of org A are intact after the attempts', async () => {
    const customer = await a.api().get(`/customers/${ids.customer}`).expect(200);
    expect(customer.body.name).toBe('Customer A');
    await a.api().get(`/appointments/${ids.appointment}`).expect(200);
  });

  describe('module gating', () => {
    it('returns 403 when the module is disabled for the organization', async () => {
      const prisma = app.get(PrismaService);
      const c = await createTenant(app);
      await prisma.organization.update({
        where: { id: c.organizationId },
        data: { enabledModules: ['customers'] },
      });

      await c.api().get('/customers').expect(200);
      await c.api().get('/appointments').expect(403);
    });
  });

  describe('vertical attributes', () => {
    it('validates customer attributes against the org vertical schema', async () => {
      await a
        .api()
        .post('/customers')
        .send({ name: 'Bad', attributes: { birthDate: 'not-a-date', unknownField: 1 } })
        .expect(422); // DomainError INVALID → 422 (see http-error.mapper.ts)

      const ok = await a
        .api()
        .post('/customers')
        .send({ name: 'Good', attributes: { birthDate: '1990-05-20', healthInsurance: 'OSDE' } })
        .expect(201);
      expect(ok.body.attributes).toEqual({ birthDate: '1990-05-20', healthInsurance: 'OSDE' });
    });

    it('exposes the vertical template on /organizations/current', async () => {
      const res = await a.api().get('/organizations/current').expect(200);
      expect(res.body.vertical.key).toBe('dental');
      expect(res.body.vertical.terminology.customer.singular).toBe('Paciente');
      expect(res.body.vertical).not.toHaveProperty('roles');
      expect(res.body.enabledModules).toEqual(['customers', 'scheduling']);
    });
  });
});
