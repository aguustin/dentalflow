import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

/** @param providers optional provider overrides, e.g. a fake payment gateway */
export async function createTestApp(providers: { token: unknown; value: unknown }[] = []): Promise<INestApplication> {
  let builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true });
  for (const p of providers) builder = builder.overrideProvider(p.token as never).useValue(p.value);
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

export interface TestTenant {
  organizationId: string;
  slug: string;
  token: string;
  /** Authenticated request helper: api(t).get('/customers') */
  api: () => ReturnType<typeof authed>;
}

function authed(app: INestApplication, token: string) {
  const agent = request(app.getHttpServer());
  const withAuth = (req: request.Test) => req.set('Authorization', `Bearer ${token}`);
  return {
    get: (url: string) => withAuth(agent.get(`/api/v1${url}`)),
    post: (url: string) => withAuth(agent.post(`/api/v1${url}`)),
    put: (url: string) => withAuth(agent.put(`/api/v1${url}`)),
    patch: (url: string) => withAuth(agent.patch(`/api/v1${url}`)),
    delete: (url: string) => withAuth(agent.delete(`/api/v1${url}`)),
  };
}

let counter = 0;

/** Creates an organization through the real onboarding flow and logs in as its owner. */
export async function createTenant(app: INestApplication, vertical = 'dental'): Promise<TestTenant> {
  const slug = `org-${Date.now()}-${++counter}`;
  const email = `owner@${slug}.test`;
  const password = 'secret123';

  const onboarding = await request(app.getHttpServer())
    .post('/api/v1/organizations')
    .send({
      organizationName: slug,
      slug,
      ownerEmail: email,
      ownerFirstName: 'Owner',
      ownerLastName: 'Test',
      ownerPassword: password,
      vertical,
    })
    .expect(201);

  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password, organizationSlug: slug })
    .expect((res) => {
      if (res.status >= 300) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
    });

  // Tests need the paid plan's limits; outside tests a paid plan is only activated by Mercado Pago
  const prisma = app.get(PrismaService);
  const pro = await prisma.plan.findUniqueOrThrow({ where: { name: 'pro' } });
  await prisma.subscription.update({
    where: { organizationId: onboarding.body.organization.id },
    data: { planId: pro.id },
  });

  const token: string = login.body.accessToken;
  return {
    organizationId: onboarding.body.organization.id,
    slug,
    token,
    api: () => authed(app, token),
  };
}
