import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import {
  MercadoPagoOAuthClient,
  OAuthGrantRejectedError,
  OAuthTokens,
} from '../application/mercadopago-oauth.client';

const API = 'https://api.mercadopago.com';
const TIMEOUT_MS = 15_000;

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: number | string;
  public_key?: string | null;
  live_mode?: boolean;
}

@Injectable()
export class MercadoPagoOAuthHttpClient implements MercadoPagoOAuthClient {
  private readonly logger = new Logger(MercadoPagoOAuthHttpClient.name);

  private get credentials() {
    const clientId = process.env.MERCADOPAGO_CLIENT_ID;
    const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableException('Mercado Pago OAuth is not configured (MERCADOPAGO_CLIENT_ID / _SECRET)');
    }
    return { clientId, clientSecret };
  }

  authorizationUrl(input: { state: string; redirectUri: string }): string {
    const base = process.env.MERCADOPAGO_AUTH_URL ?? 'https://auth.mercadopago.com/authorization';
    const url = new URL(base);
    url.searchParams.set('client_id', this.credentials.clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('platform_id', 'mp');
    url.searchParams.set('state', input.state);
    url.searchParams.set('redirect_uri', input.redirectUri);
    return url.toString();
  }

  exchangeCode(input: { code: string; redirectUri: string }): Promise<OAuthTokens> {
    return this.token({ grant_type: 'authorization_code', code: input.code, redirect_uri: input.redirectUri });
  }

  refresh(refreshToken: string): Promise<OAuthTokens> {
    return this.token({ grant_type: 'refresh_token', refresh_token: refreshToken });
  }

  async accountLabel(accessToken: string): Promise<string | null> {
    try {
      const res = await fetch(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) return null;
      const me = (await res.json()) as { nickname?: string; email?: string };
      return me.email ?? me.nickname ?? null;
    } catch {
      return null;
    }
  }

  private async token(grant: Record<string, string>): Promise<OAuthTokens> {
    const { clientId, clientSecret } = this.credentials;
    let res: Response;
    try {
      res = await fetch(`${API}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          ...grant,
          ...(process.env.MERCADOPAGO_OAUTH_TEST_TOKEN === 'true' && { test_token: 'true' }),
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      this.logger.error(`Mercado Pago OAuth unreachable (${grant.grant_type}): ${String(err)}`);
      throw new ServiceUnavailableException('Mercado Pago is not reachable right now. Try again in a few minutes.');
    }
    const data = (await res.json().catch(() => ({}))) as Partial<TokenResponse> & { message?: string; error?: string };
    if (!res.ok) {
      // Never log tokens or codes: only Mercado Pago's error description
      this.logger.warn(`Mercado Pago OAuth ${res.status} (${grant.grant_type}): ${data.error ?? ''} ${data.message ?? ''}`);
      if (res.status >= 400 && res.status < 500) throw new OAuthGrantRejectedError(data.message ?? data.error ?? 'invalid_grant');
      throw new ServiceUnavailableException('Mercado Pago could not complete the authorization');
    }
    if (!data.access_token || !data.refresh_token || !data.user_id) {
      throw new ServiceUnavailableException('Unexpected response from Mercado Pago OAuth');
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in ?? 15_552_000,
      userId: String(data.user_id),
      publicKey: data.public_key ?? null,
      liveMode: !!data.live_mode,
    };
  }
}
