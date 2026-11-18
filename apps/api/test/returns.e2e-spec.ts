import { INestApplication } from '@nestjs/common';
import { createTenant, createTestApp, TestTenant } from './helpers';

/** Returns (refunds, stock back to the exact variant, concurrency) and serial numbers. */
describe('Returns & serials (e2e)', () => {
  let app: INestApplication;
  let t: TestTenant;
  let other: TestTenant;
  let v128: string;
  let v256: string;

  beforeAll(async () => {
    app = await createTestApp();
    t = await createTenant(app, 'retail_tech');
    other = await createTenant(app, 'retail_clothing');

    const group = await t
      .api()
      .post('/catalog')
      .send({ type: 'PRODUCT', name: 'Celular X', sku: 'CX', price: 100_000, isVariantGroup: true, attributes: { warrantyMonths: 12 } })
      .expect(201);
    const generated = await t
      .api()
      .post(`/catalog/${group.body.id}/variants`)
      .send({ axes: [{ name: 'Capacidad', values: ['128 GB', '256 GB'] }] })
      .expect(201);
    const variants = generated.body.group.variants as { id: string; sku: string }[];
    v128 = variants.find((v) => v.sku === 'CX-128GB')!.id;
    v256 = variants.find((v) => v.sku === 'CX-256GB')!.id;
    await t.api().post(`/inventory/${v128}/purchase`).send({ quantity: 3 }).expect(201);
    await t.api().post(`/inventory/${v256}/purchase`).send({ quantity: 3 }).expect(201);
    await t.api().post('/cash/open').send({ openingAmount: 0 }).expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  const stockOf = async (id: string) => (await t.api().get(`/inventory/${id}`).expect(200)).body.stockQuantity as number;
  const serial = (s: string) => t.api().get(`/sales/serials/${encodeURIComponent(s)}`);
  const returnUnits = (saleId: string, items: object[], refundMethod = 'CASH') =>
    t.api().post(`/sales/${saleId}/returns`).send({ items, refundMethod, reason: 'No le gustó' });

  let sale: {
    id: string;
    total: number;
    items: { id: string; catalogItemId: string; quantity: number }[];
  };

  it('sells with serial numbers and warranty; a sold serial cannot be sold again', async () => {
    const res = await t
      .api()
      .post('/sales/checkout')
      .send({
        globalDiscount: 1_001,
        items: [
          { catalogItemId: v128, quantity: 2, serials: ['IMEI-A1', 'IMEI-A2'] },
          { catalogItemId: v256, quantity: 1, serials: ['IMEI-B1'] },
        ],
        payment: { method: 'CASH' },
      })
      .expect(201);
    sale = res.body;
    expect(res.body).toMatchObject({ status: 'PAID', total: 298_999 });

    const found = await serial('IMEI-A1').expect(200);
    expect(found.body[0]).toMatchObject({ product: 'Celular X · 128 GB', inWarranty: true, returnedAt: null });
    expect(found.body[0].sale.number).toBe(res.body.number);

    await t
      .api()
      .post('/sales/checkout')
      .send({ items: [{ catalogItemId: v128, quantity: 1, serials: ['IMEI-A1'] }], payment: { method: 'CASH' } })
      .expect(409);
    // one serial per unit
    await t
      .api()
      .post('/sales/checkout')
      .send({ items: [{ catalogItemId: v128, quantity: 1, serials: ['X', 'Y'] }], payment: { method: 'CASH' } })
      .expect(422);
  });

  it('returns a unit: serial required, stock back to the exact variant, cash refunded', async () => {
    const line128 = sale.items.find((i) => i.catalogItemId === v128)!;
    const [before128, before256] = [await stockOf(v128), await stockOf(v256)];

    await returnUnits(sale.id, [{ saleItemId: line128.id, quantity: 1 }]).expect(422); // which serial?
    await returnUnits(sale.id, [{ saleItemId: line128.id, quantity: 1, serials: ['IMEI-B1'] }]).expect(422); // not this line

    const after = await returnUnits(sale.id, [{ saleItemId: line128.id, quantity: 1, serials: ['IMEI-A2'] }]).expect(201);
    expect(after.body.refundedTotal).toBeGreaterThan(0);
    expect(after.body.items.find((i: { id: string }) => i.id === line128.id).returnedQuantity).toBe(1);

    expect(await stockOf(v128)).toBe(before128 + 1);
    expect(await stockOf(v256)).toBe(before256);
    expect((await serial('IMEI-A2').expect(200)).body[0].returnedAt).not.toBeNull();

    const cash = await t.api().get('/cash/current').expect(200);
    expect(cash.body.refundsByMethod.CASH).toBe(after.body.refundedTotal);
    expect(cash.body.expectedCash).toBe(sale.total - after.body.refundedTotal);
  });

  it('never returns more than sold, even with simultaneous returns', async () => {
    const line128 = sale.items.find((i) => i.catalogItemId === v128)!;
    await returnUnits(sale.id, [{ saleItemId: line128.id, quantity: 2, serials: ['IMEI-A1', 'IMEI-A2'] }]).expect(422);

    const [r1, r2] = await Promise.all([
      returnUnits(sale.id, [{ saleItemId: line128.id, quantity: 1, serials: ['IMEI-A1'] }]),
      returnUnits(sale.id, [{ saleItemId: line128.id, quantity: 1, serials: ['IMEI-A1'] }]),
    ]);
    expect([r1.status, r2.status].filter((s) => s === 201)).toHaveLength(1);
    expect([r1.status, r2.status].every((s) => [201, 409, 422].includes(s))).toBe(true);
  });

  it('returning everything refunds exactly what was paid (discount included)', async () => {
    const line256 = sale.items.find((i) => i.catalogItemId === v256)!;
    const done = await returnUnits(sale.id, [{ saleItemId: line256.id, quantity: 1, serials: ['IMEI-B1'] }], 'CARD').expect(201);
    expect(done.body.refundedTotal).toBe(sale.total);
    expect(done.body.returns).toHaveLength(3);
  });

  it('a returned serial can be sold again', async () => {
    await t
      .api()
      .post('/sales/checkout')
      .send({ items: [{ catalogItemId: v128, quantity: 1, serials: ['IMEI-A2'] }], payment: { method: 'CARD' } })
      .expect(201);
  });

  it('only fully paid sales accept returns; other shops cannot touch them', async () => {
    const draft = await t.api().post('/sales').send({ items: [{ catalogItemId: v256, quantity: 1 }] }).expect(201);
    await returnUnits(draft.body.id, [{ saleItemId: draft.body.items[0].id, quantity: 1 }]).expect(409);

    await other
      .api()
      .post(`/sales/${sale.id}/returns`)
      .send({ items: [{ saleItemId: sale.items[0].id, quantity: 1 }], refundMethod: 'CASH' })
      .expect(404);
    await other.api().get('/sales/serials/IMEI-A1').expect(404);
  });
});
