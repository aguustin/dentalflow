import { INestApplication } from '@nestjs/common';
import { createTenant, createTestApp, TestTenant } from './helpers';

/**
 * Treatment plan billing (once per item, even concurrently; voided sales release items)
 * and clinical attachments (real file type check, authorized download).
 */
describe('Treatment plans & attachments (e2e)', () => {
  let app: INestApplication;
  let t: TestTenant;
  let patientId: string;
  let serviceId: string;

  beforeAll(async () => {
    app = await createTestApp();
    t = await createTenant(app);
    patientId = (await t.api().post('/customers').send({ name: 'Paciente Plan' }).expect(201)).body.id;
    serviceId = (
      await t.api().post('/catalog').send({ type: 'SERVICE', name: 'Obturación', price: 30_000 }).expect(201)
    ).body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  const base = () => `/clinical/${patientId}/treatment-plans`;
  const setStatus = (planId: string, itemId: string, status: string) =>
    t.api().patch(`${base()}/${planId}/items/${itemId}`).send({ status });

  it('bills done items once; a voided sale releases them; concurrent billing never duplicates', async () => {
    const plan = await t
      .api()
      .post(base())
      .send({
        title: 'Plan 1',
        items: [
          { catalogItemId: serviceId, tooth: 16, surface: 'O' },
          { catalogItemId: serviceId, tooth: 26, price: 25_000 },
        ],
      })
      .expect(201);
    const [i1, i2] = plan.body.items;
    expect(plan.body.totals.quoted).toBe(55_000);

    // Nothing done yet
    await t.api().post(`${base()}/${plan.body.id}/bill`).send({}).expect(422);
    // Can't jump from proposed to done
    await setStatus(plan.body.id, i1.id, 'DONE').expect(409);

    await setStatus(plan.body.id, i1.id, 'ACCEPTED').expect(200);
    await setStatus(plan.body.id, i1.id, 'DONE').expect(200);
    // Done items can't be edited anymore
    await t.api().patch(`${base()}/${plan.body.id}/items/${i1.id}`).send({ price: 1 }).expect(409);

    const billed = await t.api().post(`${base()}/${plan.body.id}/bill`).send({}).expect(201);
    const sale = await t.api().get(`/sales/${billed.body.saleId}`).expect(200);
    expect(sale.body).toMatchObject({ status: 'DRAFT', customerId: patientId, total: 30_000 });
    expect(sale.body.items[0].description).toBe('Obturación · pieza 16 (O)');
    await t.api().post(`${base()}/${plan.body.id}/bill`).send({}).expect(422); // already billed

    // Concurrent billing of the second item: exactly one sale
    await setStatus(plan.body.id, i2.id, 'ACCEPTED').expect(200);
    await setStatus(plan.body.id, i2.id, 'DONE').expect(200);
    const [r1, r2] = await Promise.all([
      t.api().post(`${base()}/${plan.body.id}/bill`).send({}),
      t.api().post(`${base()}/${plan.body.id}/bill`).send({}),
    ]);
    expect([r1.status, r2.status].filter((s) => s === 201)).toHaveLength(1);
    expect([r1.status, r2.status].every((s) => [201, 409, 422].includes(s))).toBe(true);

    // Voiding the first sale makes item 1 billable again
    await t.api().post(`/sales/${billed.body.saleId}/void`).expect(200);
    const plans = await t.api().get(base()).expect(200);
    const again = plans.body[0].items.find((i: { id: string }) => i.id === i1.id);
    expect(again.billable).toBe(true);
    await t.api().post(`${base()}/${plan.body.id}/bill`).send({ itemIds: [i1.id] }).expect(201);
  });

  it('accepts real images/PDFs only and serves them back to authorized users', async () => {
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 7)]);
    const uploaded = await t
      .api()
      .post(`/clinical/${patientId}/attachments`)
      .field('description', 'Radiografía panorámica')
      .attach('file', png, { filename: 'radiografía 1.png', contentType: 'image/png' })
      .expect(201);
    expect(uploaded.body).toMatchObject({ mimeType: 'image/png', size: png.length, filename: 'radiografía 1.png' });

    // A text file disguised as PNG is rejected (type detected from content, not the name)
    await t
      .api()
      .post(`/clinical/${patientId}/attachments`)
      .attach('file', Buffer.from('<script>alert(1)</script>'), { filename: 'x.png', contentType: 'image/png' })
      .expect(422);

    const file = await t
      .api()
      .get(`/clinical/${patientId}/attachments/${uploaded.body.id}/file`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(file.headers['content-type']).toBe('image/png');
    expect(file.headers['x-content-type-options']).toBe('nosniff');
    expect(Buffer.compare(file.body as Buffer, png)).toBe(0);

    await t.api().delete(`/clinical/${patientId}/attachments/${uploaded.body.id}`).expect(204);
    await t.api().get(`/clinical/${patientId}/attachments/${uploaded.body.id}/file`).expect(404);
  });
});
