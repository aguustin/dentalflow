import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PaymentAccount } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { DomainError } from '../../../shared/contracts/errors/domain.error';
import { TokenCipher } from '../domain/token-cipher';
import { signOAuthState, verifyOAuthState } from '../domain/oauth-state';
import {
  MP_OAUTH_CLIENT,
  MercadoPagoOAuthClient,
  OAuthGrantRejectedError,
  OAuthTokens,
} from './mercadopago-oauth.client';

const PROVIDER = 'mercadopago';
const DAY_MS = 24 * 60 * 60 * 1000;
/** Refresh when the token is used this close to its expiry (Mercado Pago gives 180 days). */
const REFRESH_WITHIN_MS = 30 * DAY_MS;

export type ConnectResult = { ok: true } | { ok: false; reason: 'denied' | 'invalid_state' | 'rejected' | 'failed' };

/**
 * The organization's own Mercado Pago account, connected with OAuth, to collect from its
 * customers (phase 10C). Security rules:
 *  - tokens are encrypted at rest and bound to the organization (TokenCipher);
 *  - the public OAuth callback trusts only a signed, short-lived state;
 *  - tokens never leave the server (status exposes only non-secret data).
 */
@Injectable()
export class PaymentAccountsService {
  private readonly logger = new Logger(PaymentAccountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MP_OAUTH_CLIENT) private readonly oauth: MercadoPagoOAuthClient,
  ) {}

  private get key(): string {
    const key = process.env.PAYMENT_TOKENS_KEY;
    if (!key) throw new ServiceUnavailableException('Online payments are not configured (PAYMENT_TOKENS_KEY)');
    return key;
  }

  private get cipher(): TokenCipher {
    return TokenCipher.fromBase64(this.key)!;
  }

  redirectUri(): string {
    const api = process.env.APP_PUBLIC_API_URL ?? 'http://localhost:3000';
    return process.env.MERCADOPAGO_OAUTH_REDIRECT_URI ?? `${api}/api/v1/oauth/mercadopago/callback`;
  }

  async status(organizationId: string) {
    const configured =
      !!process.env.MERCADOPAGO_CLIENT_ID && !!process.env.MERCADOPAGO_CLIENT_SECRET && !!process.env.PAYMENT_TOKENS_KEY;
    let account = await this.find(organizationId);
    // Keep an idle connection alive: renew when close to expiry (best effort)
    if (account?.status === 'ACTIVE' && account.expiresAt.getTime() - Date.now() < REFRESH_WITHIN_MS) {
      await this.accessToken(organizationId).catch(() => undefined);
      account = await this.find(organizationId);
    }
    return {
      configured,
      connected: !!account,
      account: account && {
        label: account.accountLabel,
        externalUserId: account.externalUserId,
        liveMode: account.liveMode,
        needsReconnect: account.status !== 'ACTIVE' || account.expiresAt.getTime() <= Date.now(),
        connectedAt: account.createdAt,
        expiresAt: account.expiresAt,
      },
    };
  }

  /** Returns the Mercado Pago URL where the organization authorizes Velatrix. */
  startConnect(organizationId: string, userId: string) {
    const state = signOAuthState({ organizationId, userId }, this.key);
    return { authorizationUrl: this.oauth.authorizationUrl({ state, redirectUri: this.redirectUri() }) };
  }

  /** Public callback (browser redirect from Mercado Pago). Never throws: the result drives a redirect. */
  async completeConnect(input: { code?: string; state?: string; error?: string }): Promise<ConnectResult> {
    const payload = verifyOAuthState(input.state, this.key);
    if (!payload) return { ok: false, reason: 'invalid_state' };
    if (input.error || !input.code) return { ok: false, reason: 'denied' };

    // The user who started it must still belong to the organization
    const membership = await this.prisma.membership.findFirst({
      where: { userId: payload.userId, organizationId: payload.organizationId, isActive: true },
      select: { id: true },
    });
    if (!membership) return { ok: false, reason: 'invalid_state' };

    try {
      const tokens = await this.oauth.exchangeCode({ code: input.code, redirectUri: this.redirectUri() });
      const label = await this.oauth.accountLabel(tokens.accessToken);
      await this.save(payload.organizationId, tokens, { connectedBy: payload.userId, label });
      return { ok: true };
    } catch (err) {
      if (err instanceof OAuthGrantRejectedError) return { ok: false, reason: 'rejected' };
      this.logger.error(`Mercado Pago connection failed for org ${payload.organizationId}: ${String(err)}`);
      return { ok: false, reason: 'failed' };
    }
  }

  async disconnect(organizationId: string) {
    // Tokens are deleted; the organization can also revoke the app from its Mercado Pago account
    await this.prisma.paymentAccount.deleteMany({ where: { organizationId, provider: PROVIDER } });
    return this.status(organizationId);
  }

  /**
   * A valid access token of the organization's account, renewed when close to expiry.
   * Concurrent renewals: only one wins the conditional update; the others reuse its result.
   */
  async accessToken(organizationId: string): Promise<{ accessToken: string; account: PaymentAccount }> {
    const account = await this.find(organizationId);
    if (!account || account.status !== 'ACTIVE') {
      throw new DomainError('CONFLICT', 'Connect a Mercado Pago account to collect online', {
        reason: account ? 'PAYMENT_ACCOUNT_REAUTH' : 'PAYMENT_ACCOUNT_MISSING',
      });
    }
    if (account.expiresAt.getTime() - Date.now() > REFRESH_WITHIN_MS) {
      return { accessToken: this.cipher.decrypt(account.accessTokenEnc, organizationId), account };
    }

    let tokens: OAuthTokens;
    try {
      tokens = await this.oauth.refresh(this.cipher.decrypt(account.refreshTokenEnc, organizationId));
    } catch (err) {
      if (err instanceof OAuthGrantRejectedError) {
        // Maybe another request already rotated the refresh token
        const fresh = await this.find(organizationId);
        if (fresh && fresh.updatedAt.getTime() !== account.updatedAt.getTime() && fresh.status === 'ACTIVE') {
          return { accessToken: this.cipher.decrypt(fresh.accessTokenEnc, organizationId), account: fresh };
        }
        await this.prisma.paymentAccount.updateMany({
          where: { id: account.id, updatedAt: account.updatedAt },
          data: { status: 'REAUTH_REQUIRED' },
        });
        throw new DomainError('CONFLICT', 'The Mercado Pago connection expired: connect the account again', {
          reason: 'PAYMENT_ACCOUNT_REAUTH',
        });
      }
      // Provider unreachable: the current token still works until it really expires
      if (account.expiresAt.getTime() > Date.now()) {
        return { accessToken: this.cipher.decrypt(account.accessTokenEnc, organizationId), account };
      }
      throw err;
    }

    const updated = await this.prisma.paymentAccount.updateMany({
      where: { id: account.id, updatedAt: account.updatedAt },
      data: this.tokenData(organizationId, tokens),
    });
    const current = await this.find(organizationId);
    if (!current) throw new DomainError('CONFLICT', 'The Mercado Pago account was disconnected', { reason: 'PAYMENT_ACCOUNT_MISSING' });
    if (updated.count === 0) this.logger.log(`Token of org ${organizationId} was renewed concurrently`);
    return { accessToken: this.cipher.decrypt(current.accessTokenEnc, organizationId), account: current };
  }

  private find(organizationId: string) {
    return this.prisma.paymentAccount.findUnique({
      where: { organizationId_provider: { organizationId, provider: PROVIDER } },
    });
  }

  private tokenData(organizationId: string, tokens: OAuthTokens) {
    return {
      externalUserId: tokens.userId,
      accessTokenEnc: this.cipher.encrypt(tokens.accessToken, organizationId),
      refreshTokenEnc: this.cipher.encrypt(tokens.refreshToken, organizationId),
      publicKey: tokens.publicKey,
      liveMode: tokens.liveMode,
      expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      status: 'ACTIVE',
    };
  }

  private async save(organizationId: string, tokens: OAuthTokens, meta: { connectedBy: string; label: string | null }) {
    const data = { ...this.tokenData(organizationId, tokens), accountLabel: meta.label, connectedBy: meta.connectedBy };
    await this.prisma.paymentAccount.upsert({
      where: { organizationId_provider: { organizationId, provider: PROVIDER } },
      create: { organizationId, provider: PROVIDER, ...data },
      update: data,
    });
  }
}
