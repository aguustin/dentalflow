import { INestApplication } from '@nestjs/common';
import { createTenant, createTestApp, TestTenant } from './helpers';

/**
 * Scheduling rules that need a real database: concurrent double booking (exclusion
 * constraint), resource conflicts and availability wiring. The slot algorithm itself is
 * unit-tested in availability.spec.ts.
 */
describe('Scheduling (e2e)', () => {
  let app: INestApplication;
  let t: TestTenant;
  let staffId: string;
  let customers: string[];

  // 2030-01-07 is a Monday; tenant time zone defaults to America/Argentina/Buenos_Aires (UTC-3)
  const MONDAY = '2030-01-07';
  const local = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return new Date(Date.UTC(2030, 0, 7, h + 3, m)).toISOString();
  };

  beforeAll(async () => {
    app = await createTestApp();
    t = await createTenant(app);
    staffId = (await t.api().post('/staff').send({ name: 'Dr. Test' }).expect(201)).body.id;
    customers = [];
    for (const name of ['Ana', 'Beto', 'Caro']) {
      customers.push((await t.api().post('/customers').send({ name }).expect(201)).body.id);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  const book = (customerId: string, start: string, end: string, extra: Record<string, unknown> = {}) =>
    t
      .api()
      .post('/appointments')
      .send({ customerId, staffId, title: 'Turno', startTime: start, endTime: end, ...extra });

  it('only one of two simultaneous bookings for the same staff and time succeeds', async () => {
    const [r1, r2] = await Promise.all([
      book(customers[0], local('16:00'), local('17:00')),
      book(customers[1], local('16:00'), local('17:00')),
    ]);
    expect([r1.status, r2.status].sort()).toEqual([201, 409]);
  });

  it('rejects two staff members booking the same resource at the same time', async () => {
    const resourceId = (await t.api().post('/resources').send({ name: 'Sillón 1' }).expect(201)).body.id;
    const otherStaff = (await t.api().post('/staff').send({ name: 'Dra. Otra' }).expect(201)).body.id;

    await book(customers[0], local('18:00'), local('19:00'), { resourceId }).expect(201);
    const res = await book(customers[1], local('18:30'), local('19:30'), { resourceId, staffId: otherStaff });
    expect(res.status).toBe(409);
  });

  it('availability follows working hours and existing appointments', async () => {
    await t
      .api()
      .put(`/staff/${staffId}/working-hours`)
      .send({ ranges: [{ weekday: 1, startMinute: 9 * 60, endMinute: 12 * 60 }] })
      .expect(200);

    const before = await t.api().get(`/appointments/availability?staffId=${staffId}&date=${MONDAY}&duration=60`).expect(200);
    expect(before.body.timezone).toBe('America/Argentina/Buenos_Aires');
    // 60-min slots every 15 min within 09:00–12:00 → 09:00 … 11:00
    const starts = before.body.slots.map((s: { startTime: string }) => s.startTime);
    expect(starts).toHaveLength(9);
    expect(starts[0]).toBe(local('09:00'));
    expect(starts[8]).toBe(local('11:00'));

    await book(customers[2], local('10:00'), local('11:00')).expect(201);
    const after = await t.api().get(`/appointments/availability?staffId=${staffId}&date=${MONDAY}&duration=60`).expect(200);
    expect(after.body.slots.map((s: { startTime: string }) => s.startTime)).toEqual([local('09:00'), local('11:00')]);
  });

  it('rejects overlapping working hours', async () => {
    await t
      .api()
      .put(`/staff/${staffId}/working-hours`)
      .send({
        ranges: [
          { weekday: 2, startMinute: 540, endMinute: 780 },
          { weekday: 2, startMinute: 720, endMinute: 900 },
        ],
      })
      .expect(422);
  });

  it('a confirmed appointment can still be cancelled', async () => {
    const appt = await book(customers[0], local('20:00'), local('20:30')).expect(201);
    await t.api().put(`/appointments/${appt.body.id}`).send({ status: 'CONFIRMED' }).expect(200);
    const cancelled = await t.api().delete(`/appointments/${appt.body.id}`).expect(200);
    expect(cancelled.body.status).toBe('CANCELLED');
  });
});
