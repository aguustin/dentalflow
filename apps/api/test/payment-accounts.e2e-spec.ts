import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { createTenant, createTestApp, TestTenant } from './helpers';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import {
  MP_OAUTH_CLIENT,
  MercadoPagoOAuthClient,
  OAuthGrantRejectedError,
  OAuthTokens,
} from '../src/modules/online-payments/application/mercadopago-oauth.client';
import { PaymentAccountsService } from '../src/modules/online-payments/application/payment-accounts.service';

class FakeOAuth implements MercadoPagoOAuthClient {
  refreshes = 0;
  rejectRefresh = false;
  authorizationUrl(input: { state: string; redirectUri: string }) {
    return `https://auth.mp.test/authorization?state=${encodeURIComponent(input.state)}`;
  }
  async exchangeCode(input: { code: string }): Promise<OAuthTokens> {
    if (input.code === 'bad') throw new OAuthGrantRejectedError('invalid_grant');
    return { accessToken: `APP_USR-access-${input.code}`, refreshToken: `TG-refresh-${input.code}`, expiresIn: 15_552_000, userId: '777', publicKey: 'APP_USR-pk', liveMode: false };
  }
  async refresh(refreshToken: string): Promise<OAuthTokens> {
    if (this.rejectRefresh) throw new OAuthGrantRejectedError('invalid_grant');
    this.refreshes++;
    return { accessToken: `APP_USR-renewed-${this.refreshes}`, refreshToken: `${refreshToken}-r`, expiresIn: 15_552_000, userId: '777', publicKey: 'APP_USR-pk', liveMode: false };
  }
  async accountLabel() {
    return 'clinica@testuser.com';
  }
}

describe('Clinic Mercado Pago account (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const oauth = new FakeOAuth();
  let a: TestTenant;
  let b: TestTenant;

  const stateFrom = async (t: TestTenant) => {
    const res = await t.api().post('/payment-accounts/mercadopago/connect').expect(201);
    return new URL(res.body.authorizationUrl).searchParams.get('state')!;
  };
  const callback = (query: Record<string, string>) =>
    request(app.getHttpServer()).get('/api/v1/oauth/mercadopago/callback').query(query);

  beforeAll(async () => {
    app = await createTestApp([{ token: MP_OAUTH_CLIENT, value: oauth }]);
    prisma = app.get(PrismaService);
    a = await createTenant(app);
    b = await createTenant(app);
  });
  afterAll(() => app.close());

  it('connects through a valid state and stores the tokens encrypted', async () => {
    const res = await callback({ code: 'ok-a', state: await stateFrom(a) }).expect(302);
    expect(res.headers.location).toBe('http://web.test/settings/payments?mp=connected');

    const row = await prisma.paymentAccount.findFirstOrThrow({ where: { organizationId: a.organizationId } });
    expect(row.accessTokenEnc).not.toContain('APP_USR-access');
    expect(row.refreshTokenEnc).not.toContain('TG-refresh');

    const status = await a.api().get('/payment-accounts/mercadopago').expect(200);
    expect(status.body).toMatchObject({ connected: true, account: { label: 'clinica@testuser.com', needsReconnect: false } });
    expect(JSON.stringify(status.body)).not.toContain('APP_USR-access');
  });

  it('rejects forged or tampered states and stores nothing', async () => {
    const stateA = await stateFrom(a);
    const [body, sig] = stateA.split('.');
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString());
    const forged = Buffer.from(JSON.stringify({ ...decoded, o: b.organizationId })).toString('base64url');

    for (const state of [`${forged}.${sig}`, 'garbage', '']) {
      const res = await callback({ code: 'ok-b', state }).expect(302);
      expect(res.headers.location).toContain('mp=error&reason=invalid_state');
    }
    const denied = await callback({ error: 'access_denied', state: await stateFrom(b) }).expect(302);
    expect(denied.headers.location).toContain('reason=denied');
    const rejected = await callback({ code: 'bad', state: await stateFrom(b) }).expect(302);
    expect(rejected.headers.location).toContain('reason=rejected');

    expect(await prisma.paymentAccount.count({ where: { organizationId: b.organizationId } })).toBe(0);
  });

  it('is isolated per organization', async () => {
    const statusB = await b.api().get('/payment-accounts/mercadopago').expect(200);
    expect(statusB.body.connected).toBe(false);
    await b.api().delete('/payment-accounts/mercadopago').expect(200);
    expect(await prisma.paymentAccount.count({ where: { organizationId: a.organizationId } })).toBe(1);
  });

  it('renews a token close to expiry once, and asks to reconnect when Mercado Pago refuses', async () => {
    const service = app.get(PaymentAccountsService);
    await prisma.paymentAccount.updateMany({
      where: { organizationId: a.organizationId },
      data: { expiresAt: new Date(Date.now() + 2 * 24 * 3600 * 1000) },
    });
    const [r1, r2] = await Promise.all([service.accessToken(a.organizationId), service.accessToken(a.organizationId)]);
    expect(r1.accessToken).toMatch(/^APP_USR-renewed-/);
    expect(r2.accessToken).toMatch(/^APP_USR-renewed-/);
    const row = await prisma.paymentAccount.findFirstOrThrow({ where: { organizationId: a.organizationId } });
    expect(row.expiresAt.getTime()).toBeGreaterThan(Date.now() + 100 * 24 * 3600 * 1000);

    oauth.rejectRefresh = true;
    await prisma.paymentAccount.updateMany({
      where: { organizationId: a.organizationId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(service.accessToken(a.organizationId)).rejects.toThrow(/connect the account again/);
    const status = await a.api().get('/payment-accounts/mercadopago').expect(200);
    expect(status.body.account.needsReconnect).toBe(true);
  });
});
