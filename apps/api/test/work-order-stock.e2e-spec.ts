import { INestApplication } from '@nestjs/common';
import { createTenant, createTestApp, TestTenant } from './helpers';

/**
 * Work order stock reservations: approving holds parts, counter sales respect them,
 * cancelling releases them, delivering turns them into a single sale.
 */
describe('Work order stock (e2e)', () => {
  let app: INestApplication;
  let t: TestTenant;
  let customerId: string;

  beforeAll(async () => {
    app = await createTestApp();
    t = await createTenant(app, 'repair_tech');
    customerId = (await t.api().post('/customers').send({ name: 'Cliente' }).expect(201)).body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  const part = async (stock: number) => {
    const id = (
      await t
        .api()
        .post('/catalog')
        .send({ type: 'PRODUCT', name: `Pantalla ${Math.random()}`, price: 50_000, trackStock: true })
        .expect(201)
    ).body.id as string;
    if (stock) await t.api().post(`/inventory/${id}/purchase`).send({ quantity: stock }).expect(201);
    return id;
  };
  const stock = async (id: string) => (await t.api().get(`/inventory/${id}`).expect(200)).body;
  const move = (orderId: string, to: string, note?: string) =>
    t.api().post(`/work-orders/${orderId}/transition`).send({ to, note });

  /** Order with the given part, already QUOTED. */
  const quotedOrder = async (partId: string, quantity = 1) => {
    const order = await t.api().post('/work-orders').send({ customerId, reportedIssue: 'Pantalla rota' }).expect(201);
    await move(order.body.id, 'DIAGNOSING').expect(200);
    await t
      .api()
      .put(`/work-orders/${order.body.id}/items`)
      .send({
        items: [
          { catalogItemId: partId, quantity },
          { description: 'Mano de obra', quantity: 1, unitPrice: 10_000 },
        ],
      })
      .expect(200);
    await move(order.body.id, 'QUOTED').expect(200);
    return order.body.id as string;
  };

  it('two orders competing for the last part: only one can be approved', async () => {
    const p = await part(1);
    const [o1, o2] = [await quotedOrder(p), await quotedOrder(p)];
    const [r1, r2] = await Promise.all([move(o1, 'APPROVED'), move(o2, 'APPROVED')]);
    expect([r1.status, r2.status].sort()).toEqual([200, 409]);

    const loser = r1.status === 409 ? r1 : r2;
    expect(loser.body.details.shortages[0]).toMatchObject({ catalogItemId: p, available: 0, requested: 1 });
    expect(await stock(p)).toMatchObject({ stockQuantity: 1, reservedQuantity: 1, available: 0 });
  });

  it('counter sales cannot take reserved stock; cancelling the order releases it', async () => {
    const p = await part(2);
    const order = await quotedOrder(p, 2);
    await move(order, 'APPROVED').expect(200);

    const sell = () => t.api().post('/sales').send({ items: [{ catalogItemId: p, quantity: 1 }], confirm: true });
    await sell().expect(409);
    await t.api().post(`/inventory/${p}/adjust`).send({ countedQuantity: 1 }).expect(422); // below reserved

    await move(order, 'IN_PROGRESS').expect(200);
    await move(order, 'CANCELLED', 'El cliente desistió').expect(200);
    expect(await stock(p)).toMatchObject({ stockQuantity: 2, reservedQuantity: 0, available: 2 });
    await sell().expect(201);
  });

  it('delivery creates exactly one confirmed sale and consumes the reservation', async () => {
    const p = await part(3);
    const order = await quotedOrder(p, 2);
    for (const to of ['APPROVED', 'IN_PROGRESS', 'READY']) await move(order, to).expect(200);
    expect(await stock(p)).toMatchObject({ stockQuantity: 3, reservedQuantity: 2 });

    const [r1, r2] = await Promise.all([move(order, 'DELIVERED'), move(order, 'DELIVERED')]);
    expect([r1.status, r2.status].sort()).toEqual([200, 409]);
    const delivered = r1.status === 200 ? r1 : r2;
    expect(delivered.body.sale).toMatchObject({ status: 'CONFIRMED' });

    const sale = await t.api().get(`/sales/${delivered.body.sale.id}`).expect(200);
    expect(sale.body).toMatchObject({ customerId, total: 110_000, status: 'CONFIRMED' });
    expect(await stock(p)).toMatchObject({ stockQuantity: 1, reservedQuantity: 0, available: 1 });

    // The sale can be paid normally; voiding it (no payments) gives the parts back
    await t.api().post(`/sales/${delivered.body.sale.id}/void`).expect(200);
    expect((await stock(p)).stockQuantity).toBe(3);
  });

  it('rejected quotes are returned without a sale or reservation', async () => {
    const p = await part(1);
    const order = await quotedOrder(p);
    await move(order, 'REJECTED', 'Muy caro').expect(200);
    const delivered = await move(order, 'DELIVERED').expect(200);
    expect(delivered.body.sale).toBeNull();
    expect(await stock(p)).toMatchObject({ stockQuantity: 1, reservedQuantity: 0 });
  });
});
