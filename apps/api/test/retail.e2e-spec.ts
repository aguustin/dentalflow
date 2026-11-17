import { INestApplication } from '@nestjs/common';
import { createTenant, createTestApp, TestTenant } from './helpers';

/** Retail verticals: variants, barcode lookup and the atomic point-of-sale checkout. */
describe('Retail (e2e)', () => {
  let app: INestApplication;
  let shop: TestTenant;
  let other: TestTenant;
  let groupId: string;

  beforeAll(async () => {
    app = await createTestApp();
    shop = await createTenant(app, 'retail_clothing');
    other = await createTenant(app, 'retail_tech');
    groupId = (
      await shop
        .api()
        .post('/catalog')
        .send({
          type: 'PRODUCT',
          name: 'Remera básica',
          sku: 'REM',
          price: 12_000,
          isVariantGroup: true,
          attributes: { brand: 'Propia', season: 'Verano' },
        })
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  const variantsOf = async () =>
    (await shop.api().get(`/catalog/${groupId}`).expect(200)).body.variants as {
      id: string;
      name: string;
      sku: string;
      stockQuantity: number;
    }[];
  const checkout = (items: object[], method = 'CASH') =>
    shop.api().post('/sales/checkout').send({ items, payment: { method } });

  it('retail template: POS home, product fields, no agenda', async () => {
    const org = await shop.api().get('/organizations/current').expect(200);
    expect(org.body.vertical).toMatchObject({ key: 'retail_clothing', homeRoute: '/pos' });
    expect(org.body.enabledModules).toEqual(['customers', 'catalog', 'sales', 'inventory']);
    await shop.api().get('/appointments').expect(403);
    await shop.api().post('/catalog').send({ type: 'PRODUCT', name: 'X', price: 1, attributes: { color: 'rojo' } }).expect(422);
  });

  it('generates variant combinations and only the new ones when re-run', async () => {
    const first = await shop
      .api()
      .post(`/catalog/${groupId}/variants`)
      .send({ axes: [{ name: 'Talle', values: ['S', 'M'] }, { name: 'Color', values: ['Negro', 'Blanco'] }] })
      .expect(201);
    expect(first.body.created).toBe(4);

    const again = await shop
      .api()
      .post(`/catalog/${groupId}/variants`)
      .send({ axes: [{ name: 'Talle', values: ['S', 'M', 'L'] }, { name: 'Color', values: ['Negro', 'Blanco'] }] })
      .expect(201);
    expect(again.body.created).toBe(2);

    const variants = await variantsOf();
    expect(variants).toHaveLength(6);
    expect(variants.map((v) => v.sku)).toContain('REM-L-NEGRO');

    // Catalog screen shows the group only; pickers/POS show the variants only
    const catalog = await shop.api().get('/catalog?search=Remera').expect(200);
    expect(catalog.body.items.map((i: { id: string }) => i.id)).toEqual([groupId]);
    const sellable = await shop.api().get('/catalog?search=Remera&sellable=true').expect(200);
    expect(sellable.body.total).toBe(6);
  });

  it('a variant group itself cannot be sold', async () => {
    await checkout([{ catalogItemId: groupId, quantity: 1 }]).expect(422);
  });

  it('POS: scan a barcode, check out in one step, stock and cash session updated', async () => {
    const variant = (await variantsOf()).find((v) => v.sku === 'REM-M-NEGRO')!;
    await shop.api().put(`/catalog/${variant.id}`).send({ barcode: '7791234567890' }).expect(200);
    await shop.api().post(`/inventory/${variant.id}/purchase`).send({ quantity: 3 }).expect(201);
    await shop.api().post('/cash/open').send({ openingAmount: 0 }).expect(201);

    const scanned = await shop.api().get('/catalog/lookup?code=7791234567890').expect(200);
    expect(scanned.body.id).toBe(variant.id);
    await shop.api().get('/catalog/lookup?code=rem-m-negro').expect(200); // SKU, any case
    await shop.api().get('/catalog/lookup?code=REM').expect(404); // the group is not sellable

    const sale = await checkout([{ catalogItemId: variant.id, quantity: 2 }]).expect(201);
    expect(sale.body).toMatchObject({ status: 'PAID', total: 24_000, paidTotal: 24_000, balance: 0 });
    expect(sale.body.payments).toHaveLength(1);

    const stock = await shop.api().get(`/inventory/${variant.id}`).expect(200);
    expect(stock.body.stockQuantity).toBe(1);
    const cash = await shop.api().get('/cash/current').expect(200);
    expect(cash.body.byMethod.CASH).toBe(24_000);
  });

  it('checkout is atomic: without stock no sale is created at all', async () => {
    const variant = (await variantsOf()).find((v) => v.sku === 'REM-S-BLANCO')!;
    await shop.api().put(`/catalog/${variant.id}`).send({ trackStock: true }).expect(200);
    const before = (await shop.api().get('/sales').expect(200)).body.total;

    const res = await checkout([{ catalogItemId: variant.id, quantity: 1 }]).expect(409);
    expect(res.body.details.shortages[0]).toMatchObject({ catalogItemId: variant.id, available: 0 });
    expect((await shop.api().get('/sales').expect(200)).body.total).toBe(before);
  });

  it('keeps catalogs, variants and codes isolated between shops', async () => {
    const variant = (await variantsOf())[0];
    for (const res of await Promise.all([
      other.api().get(`/catalog/${groupId}`),
      other.api().post(`/catalog/${groupId}/variants`).send({ axes: [{ name: 'Talle', values: ['XL'] }] }),
      other.api().get('/catalog/lookup?code=7791234567890'),
      other.api().post('/sales/checkout').send({ items: [{ catalogItemId: variant.id, quantity: 1 }], payment: { method: 'CASH' } }),
    ])) {
      expect([403, 404]).toContain(res.status);
    }
  });
});
