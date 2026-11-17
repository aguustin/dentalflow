import { INestApplication } from '@nestjs/common';
import request = require('supertest');
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
    ids.staff = (await a.api().post('/staff').send({ name: 'Staff A' }).expect(201)).body.id;
    ids.resource = (await a.api().post('/resources').send({ name: 'Chair A' }).expect(201)).body.id;
    ids.timeOff = (
      await a
        .api()
        .post(`/staff/${ids.staff}/time-off`)
        .send({ startTime: '2030-05-01T00:00:00.000Z', endTime: '2030-05-02T00:00:00.000Z' })
        .expect(201)
    ).body.id;

    // Tenant B's own staff/customer, to prove that only the foreign reference is rejected
    ids.staffB = (await b.api().post('/staff').send({ name: 'Staff B' }).expect(201)).body.id;
    ids.customerB = (await b.api().post('/customers').send({ name: 'Customer B' }).expect(201)).body.id;

    const appointment = await a
      .api()
      .post('/appointments')
      .send({
        customerId: ids.customer,
        staffId: ids.staff,
        resourceId: ids.resource,
        title: 'Visit',
        startTime: '2030-01-10T10:00:00.000Z',
        endTime: '2030-01-10T11:00:00.000Z',
      })
      .expect(201);
    ids.appointment = appointment.body.id;

    ids.catalogItem = (
      await a
        .api()
        .post('/catalog')
        .send({ type: 'PRODUCT', name: 'Cepillo', price: 1000, trackStock: true })
        .expect(201)
    ).body.id;
    await a.api().post(`/inventory/${ids.catalogItem}/purchase`).send({ quantity: 5 }).expect(201);

    const service = await a.api().post('/catalog').send({ type: 'SERVICE', name: 'Consulta', price: 500 }).expect(201);
    const plan = await a
      .api()
      .post(`/clinical/${ids.customer}/treatment-plans`)
      .send({ title: 'Plan A', items: [{ catalogItemId: service.body.id }] })
      .expect(201);
    ids.plan = plan.body.id;
    ids.planItem = plan.body.items[0].id;
    ids.attachment = (
      await a
        .api()
        .post(`/clinical/${ids.customer}/attachments`)
        .attach('file', Buffer.from('%PDF-1.4 test'), { filename: 'a.pdf', contentType: 'application/pdf' })
        .expect(201)
    ).body.id;
    ids.sale = (
      await a
        .api()
        .post('/sales')
        .send({ customerId: ids.customer, items: [{ catalogItemId: ids.catalogItem, quantity: 1 }] })
        .expect(201)
    ).body.id;
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
          staffId: ids.staffB,
          title: 'Visit',
          startTime: '2030-02-10T10:00:00.000Z',
          endTime: '2030-02-10T11:00:00.000Z',
        }),
    ],
    [
      'POST appointment with foreign staff',
      () =>
        b.api().post('/appointments').send({
          customerId: ids.customerB,
          staffId: ids.staff,
          title: 'Visit',
          startTime: '2030-02-11T10:00:00.000Z',
          endTime: '2030-02-11T11:00:00.000Z',
        }),
    ],
    [
      'POST appointment with foreign resource',
      () =>
        b.api().post('/appointments').send({
          customerId: ids.customerB,
          staffId: ids.staffB,
          resourceId: ids.resource,
          title: 'Visit',
          startTime: '2030-02-12T10:00:00.000Z',
          endTime: '2030-02-12T11:00:00.000Z',
        }),
    ],
    ['GET staff', () => b.api().get(`/staff/${ids.staff}`)],
    ['PUT staff', () => b.api().put(`/staff/${ids.staff}`).send({ name: 'Hacked' })],
    ['PUT staff working hours', () => b.api().put(`/staff/${ids.staff}/working-hours`).send({ ranges: [] })],
    [
      'POST staff time off',
      () =>
        b
          .api()
          .post(`/staff/${ids.staff}/time-off`)
          .send({ startTime: '2030-06-01T00:00:00.000Z', endTime: '2030-06-02T00:00:00.000Z' }),
    ],
    ['DELETE staff time off', () => b.api().delete(`/staff/${ids.staff}/time-off/${ids.timeOff}`)],
    ['PUT resource', () => b.api().put(`/resources/${ids.resource}`).send({ name: 'Hacked' })],
    ['GET catalog item', () => b.api().get(`/catalog/${ids.catalogItem}`)],
    ['PUT catalog item', () => b.api().put(`/catalog/${ids.catalogItem}`).send({ price: 1 })],
    ['GET sale', () => b.api().get(`/sales/${ids.sale}`)],
    ['PUT sale', () => b.api().put(`/sales/${ids.sale}`).send({ items: [] })],
    ['POST sale confirm', () => b.api().post(`/sales/${ids.sale}/confirm`)],
    ['POST sale void', () => b.api().post(`/sales/${ids.sale}/void`)],
    ['POST sale payment', () => b.api().post(`/sales/${ids.sale}/payments`).send({ method: 'CASH', amount: 1 })],
    ['POST sale from foreign appointment', () => b.api().post(`/sales/from-appointment/${ids.appointment}`)],
    [
      'POST sale with foreign catalog item',
      () => b.api().post('/sales').send({ items: [{ catalogItemId: ids.catalogItem, quantity: 1 }] }),
    ],
    [
      'POST sale with foreign customer',
      () => b.api().post('/sales').send({ customerId: ids.customer, items: [] }),
    ],
    ['GET inventory item', () => b.api().get(`/inventory/${ids.catalogItem}`)],
    ['POST inventory purchase', () => b.api().post(`/inventory/${ids.catalogItem}/purchase`).send({ quantity: 1 })],
    ['POST inventory adjust', () => b.api().post(`/inventory/${ids.catalogItem}/adjust`).send({ countedQuantity: 0 })],
    ['PUT inventory min stock', () => b.api().put(`/inventory/${ids.catalogItem}/min-stock`).send({ minStock: 1 })],
    ['GET clinical record', () => b.api().get(`/clinical/${ids.customer}`)],
    ['GET clinical notes', () => b.api().get(`/clinical/${ids.customer}/notes`)],
    ['POST clinical note', () => b.api().post(`/clinical/${ids.customer}/notes`).send({ content: 'x' })],
    ['PUT anamnesis', () => b.api().put(`/clinical/${ids.customer}/anamnesis`).send({ anamnesis: {} })],
    [
      'POST odontogram',
      () => b.api().post(`/clinical/${ids.customer}/odontogram`).send({ entries: [{ tooth: 11, surface: null, condition: 'MISSING' }] }),
    ],
    ['GET treatment plans', () => b.api().get(`/clinical/${ids.customer}/treatment-plans`)],
    [
      'PATCH treatment item',
      () => b.api().patch(`/clinical/${ids.customer}/treatment-plans/${ids.plan}/items/${ids.planItem}`).send({ status: 'ACCEPTED' }),
    ],
    ['POST bill treatment plan', () => b.api().post(`/clinical/${ids.customer}/treatment-plans/${ids.plan}/bill`).send({})],
    ['GET attachments', () => b.api().get(`/clinical/${ids.customer}/attachments`)],
    ['GET attachment file', () => b.api().get(`/clinical/${ids.customer}/attachments/${ids.attachment}/file`)],
    ['DELETE attachment', () => b.api().delete(`/clinical/${ids.customer}/attachments/${ids.attachment}`)],
    ['GET odontogram history', () => b.api().get(`/clinical/${ids.customer}/odontogram/history`)],
    ['GET availability of foreign staff', () => b.api().get(`/appointments/availability?staffId=${ids.staff}&date=2030-01-10`)],
  ];

  it.each(crossTenantCases)('%s from another org is rejected', async (_name, call) => {
    const res = await call();
    expect([403, 404]).toContain(res.status);
  });

  it('lists never include other orgs data', async () => {
    const customers = await b.api().get('/customers').expect(200);
    const appointments = await b.api().get('/appointments').expect(200);
    const staff = await b.api().get('/staff').expect(200);
    const resources = await b.api().get('/resources').expect(200);
    expect(customers.body.items.map((c: { id: string }) => c.id)).toEqual([ids.customerB]);
    expect(appointments.body.items).toHaveLength(0);
    expect(staff.body.map((m: { id: string }) => m.id)).toEqual([ids.staffB]);
    expect(resources.body).toHaveLength(0);
    const catalog = await b.api().get('/catalog').expect(200);
    const sales = await b.api().get('/sales').expect(200);
    expect(catalog.body.items).toHaveLength(0);
    expect(sales.body.items).toHaveLength(0);
    const inventory = await b.api().get('/inventory').expect(200);
    expect(inventory.body).toHaveLength(0);
  });

  it('resources of org A are intact after the attempts', async () => {
    const customer = await a.api().get(`/customers/${ids.customer}`).expect(200);
    expect(customer.body.name).toBe('Customer A');
    await a.api().get(`/appointments/${ids.appointment}`).expect(200);
    const staff = await a.api().get(`/staff/${ids.staff}`).expect(200);
    expect(staff.body.name).toBe('Staff A');
    expect(staff.body.upcomingTimeOff).toHaveLength(1);
    const sale = await a.api().get(`/sales/${ids.sale}`).expect(200);
    expect(sale.body).toMatchObject({ status: 'DRAFT', total: 1000 });
    const item = await a.api().get(`/catalog/${ids.catalogItem}`).expect(200);
    expect(item.body.price).toBe(1000);
    await a.api().get(`/clinical/${ids.customer}/attachments/${ids.attachment}/file`).expect(200);
    const plans = await a.api().get(`/clinical/${ids.customer}/treatment-plans`).expect(200);
    expect(plans.body[0].items[0].status).toBe('PROPOSED');
    const stock = await a.api().get(`/inventory/${ids.catalogItem}`).expect(200);
    expect(stock.body.stockQuantity).toBe(5);
  });

  describe('onboarding', () => {
    it('does not attach an existing account as owner without its password', async () => {
      const ownerEmail = `owner@${a.slug}.test`; // already exists (owner of org A)
      const res = await request(app.getHttpServer())
        .post('/api/v1/organizations')
        .send({
          organizationName: 'Hijack',
          slug: `hijack-${Date.now()}`,
          ownerEmail,
          ownerFirstName: 'X',
          ownerLastName: 'Y',
          ownerPassword: 'not-the-password',
        });
      expect(res.status).toBe(409);
    });
  });

  describe('members and roles', () => {
    const roleId = async (t: TestTenant, name: string): Promise<string> => {
      const roles = await t.api().get('/roles').expect(200);
      return roles.body.find((r: { name: string }) => r.name === name).id;
    };

    it('lists only members of the caller organization', async () => {
      const members = await b.api().get('/organizations/members').expect(200);
      expect(members.body).toHaveLength(1);
      expect(members.body[0].email).toBe(`owner@${b.slug}.test`);
    });

    it('applies a role change on the next token refresh', async () => {
      const email = `staff-${Date.now()}@${a.slug}.test`;
      const user = await a
        .api()
        .post('/users')
        .send({ email, firstName: 'Staff', lastName: 'Member', password: 'secret123' })
        .expect(201);
      await a
        .api()
        .post('/organizations/members')
        .send({ userId: user.body.id, roleId: await roleId(a, 'admin') })
        .expect(201);

      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'secret123', organizationSlug: a.slug })
        .expect(200);
      await request(app.getHttpServer())
        .get('/api/v1/organizations/members')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(200);

      // Demote to a role without users.read
      await a
        .api()
        .post('/roles/assign')
        .send({ userId: user.body.id, roleId: await roleId(a, 'professional') })
        .expect(204);

      const refreshed = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: login.body.refreshToken })
        .expect(200);
      await request(app.getHttpServer())
        .get('/api/v1/organizations/members')
        .set('Authorization', `Bearer ${refreshed.body.accessToken}`)
        .expect(403);
    });

    it('does not allow changing your own role', async () => {
      const me = await a.api().get('/users/me').expect(200);
      await a
        .api()
        .post('/roles/assign')
        .send({ userId: me.body.id, roleId: await roleId(a, 'professional') })
        .expect(400);
    });
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
      expect(res.body.enabledModules).toEqual(['customers', 'scheduling', 'catalog', 'sales', 'inventory', 'clinical']);
    });
  });
});
