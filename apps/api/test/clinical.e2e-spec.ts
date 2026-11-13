import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { createTenant, createTestApp, TestTenant } from './helpers';

/** Clinical data: privacy by role and the "latest entry wins" odontogram query. */
describe('Clinical (e2e)', () => {
  let app: INestApplication;
  let t: TestTenant;
  let patientId: string;

  beforeAll(async () => {
    app = await createTestApp();
    t = await createTenant(app);
    patientId = (await t.api().post('/customers').send({ name: 'Paciente Clínico' }).expect(201)).body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('reception cannot read clinical records (health data), professionals can', async () => {
    const roles = (await t.api().get('/roles').expect(200)).body as { id: string; name: string }[];
    const login = async (role: string) => {
      const email = `${role}-${Date.now()}@${t.slug}.test`;
      const user = await t.api().post('/users').send({ email, firstName: role, lastName: 'X', password: 'secret123' }).expect(201);
      await t
        .api()
        .post('/organizations/members')
        .send({ userId: user.body.id, roleId: roles.find((r) => r.name === role)!.id })
        .expect(201);
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'secret123', organizationSlug: t.slug })
        .expect(200);
      return res.body.accessToken as string;
    };

    const reception = await login('reception');
    await request(app.getHttpServer())
      .get(`/api/v1/clinical/${patientId}`)
      .set('Authorization', `Bearer ${reception}`)
      .expect(403);

    const professional = await login('professional');
    await request(app.getHttpServer())
      .post(`/api/v1/clinical/${patientId}/notes`)
      .set('Authorization', `Bearer ${professional}`)
      .send({ content: 'Primera consulta' })
      .expect(201);
  });

  it('odontogram shows the latest condition per tooth surface; HEALTHY clears it', async () => {
    const record = (entries: object[]) => t.api().post(`/clinical/${patientId}/odontogram`).send({ entries });

    await record([
      { tooth: 16, surface: 'O', condition: 'CARIES' },
      { tooth: 21, surface: null, condition: 'CROWN' },
      { tooth: 36, surface: 'M', condition: 'CARIES' },
    ]).expect(201);
    const current = await record([
      { tooth: 16, surface: 'O', condition: 'FILLING' },
      { tooth: 36, surface: 'M', condition: 'HEALTHY' },
    ]).expect(201);

    const state = current.body.map((e: { tooth: number; surface: string | null; condition: string }) => [
      e.tooth,
      e.surface,
      e.condition,
    ]);
    expect(state).toEqual([
      [16, 'O', 'FILLING'],
      [21, null, 'CROWN'],
    ]);

    const history = await t.api().get(`/clinical/${patientId}/odontogram/history?tooth=16`).expect(200);
    expect(history.body.map((h: { condition: string }) => h.condition)).toEqual(['FILLING', 'CARIES']);
  });

  it('validates tooth numbers, surfaces and condition scope', async () => {
    await t
      .api()
      .post(`/clinical/${patientId}/odontogram`)
      .send({
        entries: [
          { tooth: 19, surface: null, condition: 'MISSING' }, // invalid FDI
          { tooth: 11, surface: null, condition: 'CARIES' }, // caries needs a surface
          { tooth: 12, surface: 'O', condition: 'CROWN' }, // crown is whole-tooth
        ],
      })
      .expect(422);
  });

  it('anamnesis is validated against the vertical schema', async () => {
    await t.api().put(`/clinical/${patientId}/anamnesis`).send({ anamnesis: { allergies: 'Penicilina', unknown: 1 } }).expect(422);
    const ok = await t
      .api()
      .put(`/clinical/${patientId}/anamnesis`)
      .send({ anamnesis: { allergies: 'Penicilina', diabetes: true } })
      .expect(200);
    expect(ok.body.anamnesis).toEqual({ allergies: 'Penicilina', diabetes: true });
  });
});
