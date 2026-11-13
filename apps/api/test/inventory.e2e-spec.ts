import { INestApplication } from '@nestjs/common';
import { createTenant, createTestApp, TestTenant } from './helpers';

/** Stock ledger rules that need the real database (concurrency, atomic restore). */
describe('Inventory (e2e)', () => {
  let app: INestApplication;
  let t: TestTenant;

  beforeAll(async () => {
    app = await createTestApp();
    t = await createTenant(app);
  });

  afterAll(async () => {
    await app.close();
  });

  const product = async (stock: number, extra: Record<string, unknown> = {}) => {
    const item = await t
      .api()
      .post('/catalog')
      .send({ type: 'PRODUCT', name: `Prod ${Date.now()}-${Math.random()}`, price: 1000, trackStock: true, ...extra })
      .expect(201);
    if (stock > 0) await t.api().post(`/inventory/${item.body.id}/purchase`).send({ quantity: stock }).expect(201);
    return item.body.id as string;
  };
  const stockOf = async (id: string) => (await t.api().get(`/inventory/${id}`).expect(200)).body;
  const sell = (lines: { catalogItemId: string; quantity: number }[]) =>
    t.api().post('/sales').send({ items: lines, confirm: true });

  it('two simultaneous sales of the last unit: only one is confirmed', async () => {
    const id = await product(1);
    const [r1, r2] = await Promise.all([sell([{ catalogItemId: id, quantity: 1 }]), sell([{ catalogItemId: id, quantity: 1 }])]);
    expect([r1.status, r2.status].sort()).toEqual([201, 409]);

    const failed = r1.status === 409 ? r1 : r2;
    expect(failed.body.details.shortages[0]).toMatchObject({ catalogItemId: id, available: 0, requested: 1 });
    // The rejected sale stays as a draft the client can open
    const draft = await t.api().get(`/sales/${failed.body.details.saleId}`).expect(200);
    expect(draft.body.status).toBe('DRAFT');

    expect((await stockOf(id)).stockQuantity).toBe(0);
  });

  it('voiding gives back exactly what the sale took, even if tracking was turned off later', async () => {
    const id = await product(10);
    const sale = await sell([
      { catalogItemId: id, quantity: 3 },
      { catalogItemId: id, quantity: 2 },
    ]).expect(201);
    expect((await stockOf(id)).stockQuantity).toBe(5);

    await t.api().put(`/catalog/${id}`).send({ trackStock: false }).expect(200);
    await t.api().post(`/sales/${sale.body.id}/void`).expect(200);
    await t.api().put(`/catalog/${id}`).send({ trackStock: true }).expect(200);

    const after = await stockOf(id);
    expect(after.stockQuantity).toBe(10);
    const saleMovements = after.movements
      .filter((m: { sale: { id: string } | null }) => m.sale?.id === sale.body.id)
      .map((m: { type: string; quantity: number }) => [m.type, m.quantity]);
    expect(saleMovements).toEqual(expect.arrayContaining([['SALE', -5], ['SALE_VOID', 5]]));
  });

  it('products without stock control never block a sale', async () => {
    const id = await product(0, { trackStock: false });
    await sell([{ catalogItemId: id, quantity: 50 }]).expect(201);
  });

  it('purchases, physical counts and low-stock alerts', async () => {
    const id = await product(4);
    await t.api().put(`/inventory/${id}/min-stock`).send({ minStock: 3 }).expect(200);
    const before = (await t.api().get('/inventory/low-stock-count').expect(200)).body.count;

    const adjusted = await t.api().post(`/inventory/${id}/adjust`).send({ countedQuantity: 2, note: 'Recuento' }).expect(201);
    expect(adjusted.body).toMatchObject({ stockQuantity: 2, isLow: true });
    expect(adjusted.body.movements[0]).toMatchObject({ type: 'ADJUSTMENT', quantity: -2, balanceAfter: 2 });
    expect((await t.api().get('/inventory/low-stock-count').expect(200)).body.count).toBe(before + 1);

    const low = await t.api().get('/inventory?lowOnly=true').expect(200);
    expect(low.body.map((i: { id: string }) => i.id)).toContain(id);

    await t.api().post(`/inventory/${id}/adjust`).send({ countedQuantity: 2 }).expect(422); // no change
  });
});
