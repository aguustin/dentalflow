import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import {
  GatewayCharge,
  GatewaySubscription,
  PAYMENT_GATEWAY,
  PaymentGateway,
} from '../src/modules/billing/application/payment-gateway.interface';
import { signMercadoPagoNotification } from '../src/modules/billing/domain/mercadopago-signature';
import { createTenant, createTestApp, TestTenant } from './helpers';

/** In-memory Mercado Pago: lets tests decide the "real" remote state. */
class FakeGateway implements PaymentGateway {
  subscriptions = new Map<string, GatewaySubscription>();
  charges = new Map<string, GatewayCharge>();
  cancelled: string[] = [];
  private seq = 0;

  async createSubscription() {
    const id = `pre_${++this.seq}`;
    this.subscriptions.set(id, { id, status: 'pending', externalReference: null, nextPaymentDate: null });
    return { id, initPoint: `https://mp.test/checkout/${id}` };
  }
  async getSubscription(id: string) {
    return this.subscriptions.get(id)!;
  }
  async cancelSubscription(id: string) {
    this.cancelled.push(id);
    const s = this.subscriptions.get(id);
    if (s) s.status = 'cancelled';
  }
  async getCharge(id: string) {
    return this.charges.get(id)!;
  }
}

/**
 * High-risk billing rules (real money): no paid plan without paying, forged notifications
 * rejected, a charge notified twice stored once, cancelling stops Mercado Pago charges.
 */
describe('Billing with Mercado Pago (e2e)', () => {
  const secret = 'e2e-webhook-secret';
  const gateway = new FakeGateway();
  let app: INestApplication;
  let t: TestTenant;
  let prisma: PrismaService;
  let reqSeq = 0;

  beforeAll(async () => {
    app = await createTestApp([{ token: PAYMENT_GATEWAY, value: gateway }]);
    prisma = app.get(PrismaService);
    t = await createTenant(app);
    // Start from the free plan, as a real new organization does
    const free = await prisma.plan.findUniqueOrThrow({ where: { name: 'free' } });
    await prisma.subscription.update({ where: { organizationId: t.organizationId }, data: { planId: free.id } });
  });

  afterAll(async () => {
    await app.close();
  });

  const notify = (type: string, id: string, opts: { requestId?: string; secret?: string } = {}) => {
    const requestId = opts.requestId ?? `req-${++reqSeq}`;
    const ts = Math.floor(Date.now() / 1000);
    return request(app.getHttpServer())
      .post(`/api/v1/webhooks/mercadopago?data.id=${id}&type=${type}`)
      .set('x-request-id', requestId)
      .set('x-signature', signMercadoPagoNotification(opts.secret ?? secret, id, requestId, ts))
      .send({ type, data: { id } });
  };
  const planOf = async () => (await t.api().get('/billing/plan').expect(200)).body.subscription;

  it('a paid plan cannot be obtained without paying', async () => {
    await t.api().post('/billing/change-plan').send({ newPlanName: 'pro' }).expect(422);
    await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .send({
        organizationName: 'x',
        slug: `paid-${Date.now()}`,
        ownerEmail: `paid-${Date.now()}@x.test`,
        ownerFirstName: 'a',
        ownerLastName: 'b',
        ownerPassword: 'secret123',
        planName: 'pro',
      })
      .expect(422);
    expect((await planOf()).planName).toBe('free');
  });

  it('forged notifications are rejected and change nothing', async () => {
    const { body } = await t.api().post('/billing/checkout').send({ planName: 'pro' }).expect(201);
    expect(body.initPoint).toMatch(/^https:\/\/mp\.test/);
    const preId = (await prisma.billingCheckout.findUniqueOrThrow({ where: { id: body.checkoutId } })).mpPreapprovalId;
    gateway.subscriptions.get(preId)!.status = 'authorized';

    await notify('subscription_preapproval', preId, { secret: 'attacker' }).expect(401);
    await request(app.getHttpServer())
      .post(`/api/v1/webhooks/mercadopago?data.id=${preId}&type=subscription_preapproval`)
      .send({ type: 'subscription_preapproval', data: { id: preId } })
      .expect(401);
    expect((await planOf()).planName).toBe('free');
  });

  it('an authorized subscription activates the plan; a charge notified twice is stored once', async () => {
    const checkout = await prisma.billingCheckout.findFirstOrThrow({ where: { organizationId: t.organizationId } });
    await notify('subscription_preapproval', checkout.mpPreapprovalId).expect(200);
    expect(await planOf()).toMatchObject({ planName: 'pro', status: 'ACTIVE', paidWithMercadoPago: true });

    gateway.charges.set('7001', {
      id: '7001',
      subscriptionId: checkout.mpPreapprovalId,
      status: 'approved',
      amount: 2_500_000,
      currency: 'ARS',
      date: new Date(),
    });
    // Mercado Pago may resend the same event (same or different request id), even concurrently
    const [a, b] = await Promise.all([notify('subscription_authorized_payment', '7001'), notify('subscription_authorized_payment', '7001')]);
    expect([a.status, b.status]).toEqual([200, 200]);
    await notify('subscription_authorized_payment', '7001', { requestId: 'same-req' }).expect(200);
    const dup = await notify('subscription_authorized_payment', '7001', { requestId: 'same-req' }).expect(200);
    expect(dup.body).toEqual({ duplicate: true });

    expect(await prisma.billingPayment.count({ where: { mpPaymentId: '7001' } })).toBe(1);

    // A rejected monthly charge marks the subscription as past due
    gateway.charges.set('7002', { ...gateway.charges.get('7001')!, id: '7002', status: 'rejected' });
    await notify('subscription_authorized_payment', '7002').expect(200);
    expect((await planOf()).status).toBe('PAST_DUE');
  });

  it('cancelling stops the Mercado Pago subscription and returns to the free plan', async () => {
    const pre = (await prisma.subscription.findUniqueOrThrow({ where: { organizationId: t.organizationId } })).mpPreapprovalId!;
    await t.api().post('/billing/cancel').expect(200);
    expect(gateway.cancelled).toContain(pre);
    expect(await planOf()).toMatchObject({ planName: 'free', status: 'ACTIVE', paidWithMercadoPago: false });
  });
});
