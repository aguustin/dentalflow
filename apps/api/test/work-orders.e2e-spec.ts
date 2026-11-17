import { INestApplication } from '@nestjs/common';
import { createTenant, createTestApp, TestTenant } from './helpers';

/**
 * Repair verticals: template wiring, work order flow (history, item locking, concurrency)
 * and cross-tenant isolation between two repair shops.
 */
describe('Work orders (e2e)', () => {
  let app: INestApplication;
  let shop: TestTenant; // repair_mechanic
  let other: TestTenant; // repair_tech
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    app = await createTestApp();
    shop = await createTenant(app, 'repair_mechanic');
    other = await createTenant(app, 'repair_tech');

    ids.customer = (await shop.api().post('/customers').send({ name: 'Juan Pérez' }).expect(201)).body.id;
    ids.mechanic = (await shop.api().post('/staff').send({ name: 'Carlos' }).expect(201)).body.id;
    ids.part = (
      await shop.api().post('/catalog').send({ type: 'PRODUCT', name: 'Filtro de aceite', price: 8_000 }).expect(201)
    ).body.id;
    ids.labor = (
      await shop.api().post('/catalog').send({ type: 'SERVICE', name: 'Cambio de aceite', price: 15_000 }).expect(201)
    ).body.id;
    ids.asset = (
      await shop
        .api()
        .post('/assets')
        .send({ customerId: ids.customer, label: 'Ford Fiesta · AB123CD', attributes: { plate: 'AB123CD', year: 2015 } })
        .expect(201)
    ).body.id;
    ids.otherCustomer = (await other.api().post('/customers').send({ name: 'Ana' }).expect(201)).body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  const newOrder = (t = shop, extra: Record<string, unknown> = {}) =>
    t
      .api()
      .post('/work-orders')
      .send({ customerId: ids.customer, assetId: ids.asset, staffId: ids.mechanic, reportedIssue: 'Service 10.000 km', ...extra });
  const move = (id: string, to: string, note?: string) =>
    shop.api().post(`/work-orders/${id}/transition`).send({ to, note });

  it('repair template: vocabulary, home module and only its modules', async () => {
    const org = await shop.api().get('/organizations/current').expect(200);
    expect(org.body.vertical).toMatchObject({ key: 'repair_mechanic', homeModule: 'work_orders' });
    expect(org.body.vertical.terminology.asset.singular).toBe('Vehículo');
    expect(org.body.enabledModules).not.toContain('clinical');
    expect(org.body.enabledModules).not.toContain('scheduling');

    // Technicians are available without the scheduling module; the agenda and clinical are not
    await shop.api().get('/staff').expect(200);
    await shop.api().get('/appointments').expect(403);
    await shop.api().get(`/clinical/${ids.customer}`).expect(403);
  });

  it('validates equipment fields against the vertical (plate is required for vehicles)', async () => {
    await shop.api().post('/assets').send({ customerId: ids.customer, label: 'Sin patente', attributes: {} }).expect(422);
  });

  it('runs the repair flow with history; items lock after quoting', async () => {
    const order = await newOrder().expect(201);
    const id = order.body.id;
    expect(order.body).toMatchObject({ status: 'RECEIVED', allowedTransitions: ['DIAGNOSING', 'CANCELLED'] });

    await move(id, 'DIAGNOSING').expect(200);
    await move(id, 'QUOTED').expect(422); // no items yet
    const quoted = await shop
      .api()
      .put(`/work-orders/${id}/items`)
      .send({
        items: [
          { catalogItemId: ids.part, quantity: 1 },
          { catalogItemId: ids.labor, quantity: 1 },
          { description: 'Revisión de frenos', quantity: 1, unitPrice: 5_000 },
        ],
      })
      .expect(200);
    expect(quoted.body.totals.total).toBe(28_000);
    expect(quoted.body.items.map((i: { kind: string | null }) => i.kind)).toEqual(['PRODUCT', 'SERVICE', null]);

    await move(id, 'QUOTED').expect(200);
    await shop.api().put(`/work-orders/${id}/items`).send({ items: [] }).expect(409); // quote presented
    await move(id, 'DELIVERED').expect(409); // can't skip steps
    await move(id, 'APPROVED').expect(200);
    await move(id, 'IN_PROGRESS').expect(200);
    await move(id, 'READY').expect(200);
    const delivered = await move(id, 'DELIVERED').expect(200);

    expect(delivered.body.events.map((e: { toStatus: string }) => e.toStatus)).toEqual([
      'RECEIVED',
      'DIAGNOSING',
      'QUOTED',
      'APPROVED',
      'IN_PROGRESS',
      'READY',
      'DELIVERED',
    ]);
    const history = await shop.api().get(`/assets/${ids.asset}`).expect(200);
    expect(history.body.workOrders.map((w: { id: string }) => w.id)).toContain(id);
  });

  it('rejecting or cancelling needs a reason', async () => {
    const order = await newOrder().expect(201);
    await move(order.body.id, 'CANCELLED').expect(422);
    const cancelled = await move(order.body.id, 'CANCELLED', 'El cliente retiró el vehículo').expect(200);
    expect(cancelled.body.events.at(-1)).toMatchObject({ toStatus: 'CANCELLED', note: 'El cliente retiró el vehículo' });
  });

  it('two simultaneous transitions from the same state: only one applies', async () => {
    const order = await newOrder().expect(201);
    const [r1, r2] = await Promise.all([move(order.body.id, 'DIAGNOSING'), move(order.body.id, 'CANCELLED', 'x')]);
    expect([r1.status, r2.status].sort()).toEqual([200, 409]);
    const final = await shop.api().get(`/work-orders/${order.body.id}`).expect(200);
    expect(final.body.events).toHaveLength(2); // RECEIVED + the winning transition
  });

  it('numbers orders per organization and keeps them isolated', async () => {
    const mine = await shop.api().get('/work-orders').expect(200);
    const numbers = mine.body.map((w: { number: number }) => w.number).sort((a: number, b: number) => a - b);
    expect(numbers[0]).toBe(1);
    expect(numbers).toEqual(numbers.map((_: number, i: number) => i + 1));

    const anyOrder = mine.body[0].id;
    const attempts = [
      other.api().get(`/work-orders/${anyOrder}`),
      other.api().put(`/work-orders/${anyOrder}`).send({ diagnosis: 'x' }),
      other.api().put(`/work-orders/${anyOrder}/items`).send({ items: [] }),
      other.api().post(`/work-orders/${anyOrder}/transition`).send({ to: 'CANCELLED', note: 'x' }),
      other.api().get(`/assets/${ids.asset}`),
      other.api().put(`/assets/${ids.asset}`).send({ label: 'Hacked' }),
      other.api().post('/work-orders').send({ customerId: ids.customer, reportedIssue: 'x' }),
      other.api().post('/assets').send({ customerId: ids.customer, label: 'x', attributes: {} }),
      // Own customer, but someone else's equipment / technician
      other.api().post('/work-orders').send({ customerId: ids.otherCustomer, assetId: ids.asset, reportedIssue: 'x' }),
      other.api().post('/work-orders').send({ customerId: ids.otherCustomer, staffId: ids.mechanic, reportedIssue: 'x' }),
    ];
    for (const res of await Promise.all(attempts)) expect([403, 404]).toContain(res.status);

    expect((await other.api().get('/work-orders').expect(200)).body).toHaveLength(0);
    expect((await other.api().get('/assets').expect(200)).body).toHaveLength(0);
  });
});
