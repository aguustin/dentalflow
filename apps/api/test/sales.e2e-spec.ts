import { INestApplication } from '@nestjs/common';
import { createTenant, createTestApp, TestTenant } from './helpers';

/**
 * Sales rules that need the real database: appointment → sale, payment concurrency,
 * sequential numbering and the cash register. Money math is unit-tested in sale-rules.spec.ts.
 */
describe('Sales (e2e)', () => {
  let app: INestApplication;
  let t: TestTenant;
  let staffId: string;
  let customerId: string;
  let serviceId: string;

  beforeAll(async () => {
    app = await createTestApp();
    t = await createTenant(app);
    staffId = (await t.api().post('/staff').send({ name: 'Dra. Caja' }).expect(201)).body.id;
    customerId = (await t.api().post('/customers').send({ name: 'Paciente Venta' }).expect(201)).body.id;
    serviceId = (
      await t
        .api()
        .post('/catalog')
        .send({ type: 'SERVICE', name: 'Limpieza', price: 25_000, durationMinutes: 30 })
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  const newSale = (price = 10_000) =>
    t
      .api()
      .post('/sales')
      .send({ customerId, items: [{ description: 'Item', quantity: 1, unitPrice: price }], confirm: true })
      .expect(201)
      .then((r) => r.body);

  it('bills a completed appointment once, with its service price', async () => {
    const appt = await t
      .api()
      .post('/appointments')
      .send({
        customerId,
        staffId,
        serviceId,
        title: 'Limpieza',
        startTime: '2030-03-01T13:00:00.000Z',
        endTime: '2030-03-01T13:30:00.000Z',
      })
      .expect(201);

    // Not completed yet
    await t.api().post(`/sales/from-appointment/${appt.body.id}`).expect(409);

    await t.api().put(`/appointments/${appt.body.id}`).send({ status: 'CONFIRMED' }).expect(200);
    await t.api().put(`/appointments/${appt.body.id}`).send({ status: 'COMPLETED' }).expect(200);

    const sale = await t.api().post(`/sales/from-appointment/${appt.body.id}`).expect(201);
    expect(sale.body).toMatchObject({ status: 'DRAFT', customerId, staffId, total: 25_000 });
    expect(sale.body.items[0]).toMatchObject({ catalogItemId: serviceId, description: 'Limpieza', unitPrice: 25_000 });

    // Second attempt (also concurrently) never creates another sale
    const [r1, r2] = await Promise.all([
      t.api().post(`/sales/from-appointment/${appt.body.id}`),
      t.api().post(`/sales/from-appointment/${appt.body.id}`),
    ]);
    expect([r1.status, r2.status]).toEqual([409, 409]);
  });

  it('numbers sales sequentially even when created concurrently', async () => {
    const created = await Promise.all([newSale(), newSale(), newSale()]);
    const numbers = created.map((s) => s.number).sort((a, b) => a - b);
    expect(numbers[1]).toBe(numbers[0] + 1);
    expect(numbers[2]).toBe(numbers[0] + 2);
  });

  it('only one of two simultaneous full payments is accepted', async () => {
    const sale = await newSale(10_000);
    const pay = () => t.api().post(`/sales/${sale.id}/payments`).send({ method: 'CASH', amount: 10_000 });
    const [r1, r2] = await Promise.all([pay(), pay()]);
    expect([r1.status, r2.status].sort()).toEqual([201, 409]);

    const after = await t.api().get(`/sales/${sale.id}`).expect(200);
    expect(after.body).toMatchObject({ status: 'PAID', paidTotal: 10_000, balance: 0 });
    expect(after.body.payments).toHaveLength(1);
  });

  it('partial payments, no overpayment, no void after paying', async () => {
    const sale = await newSale(10_000);
    const partial = await t.api().post(`/sales/${sale.id}/payments`).send({ method: 'CARD', amount: 4_000 }).expect(201);
    expect(partial.body).toMatchObject({ status: 'PARTIALLY_PAID', balance: 6_000 });

    await t.api().post(`/sales/${sale.id}/payments`).send({ method: 'CASH', amount: 6_001 }).expect(422);
    await t.api().post(`/sales/${sale.id}/void`).expect(409);
    await t.api().put(`/sales/${sale.id}`).send({ items: [] }).expect(409); // no longer a draft
  });

  it('a draft can be edited and voided, but not paid', async () => {
    const draft = await t
      .api()
      .post('/sales')
      .send({ items: [{ catalogItemId: serviceId, quantity: 2, discount: 5_000 }] })
      .expect(201);
    expect(draft.body).toMatchObject({ status: 'DRAFT', subtotal: 50_000, total: 45_000 });

    await t.api().post(`/sales/${draft.body.id}/payments`).send({ method: 'CASH', amount: 100 }).expect(409);
    const edited = await t
      .api()
      .put(`/sales/${draft.body.id}`)
      .send({ items: [{ catalogItemId: serviceId, quantity: 1 }], globalDiscount: 1_000 })
      .expect(200);
    expect(edited.body.total).toBe(24_000);

    const voided = await t.api().post(`/sales/${draft.body.id}/void`).expect(200);
    expect(voided.body.status).toBe('VOIDED');
  });

  it('cash register: one open session, payments counted by method, difference at close', async () => {
    await t.api().post('/cash/open').send({ openingAmount: 5_000 }).expect(201);
    await t.api().post('/cash/open').send({ openingAmount: 0 }).expect(409);

    const s1 = await newSale(3_000);
    const s2 = await newSale(2_000);
    await t.api().post(`/sales/${s1.id}/payments`).send({ method: 'CASH', amount: 3_000 }).expect(201);
    await t.api().post(`/sales/${s2.id}/payments`).send({ method: 'TRANSFER', amount: 2_000 }).expect(201);

    const current = await t.api().get('/cash/current').expect(200);
    expect(current.body.byMethod).toMatchObject({ CASH: 3_000, TRANSFER: 2_000, CARD: 0 });
    expect(current.body.expectedCash).toBe(8_000);

    const closed = await t.api().post('/cash/close').send({ countedCash: 7_900 }).expect(200);
    expect(closed.body).toMatchObject({ expectedCash: 8_000, countedCash: 7_900, difference: -100 });
    expect((await t.api().get('/cash/current').expect(200)).body).toEqual({});
  });
});
