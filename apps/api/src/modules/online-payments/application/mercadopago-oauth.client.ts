export const MP_OAUTH_CLIENT = Symbol('MercadoPagoOAuthClient');

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  /** seconds */
  expiresIn: number;
  /** Mercado Pago user_id of the connected account */
  userId: string;
  publicKey: string | null;
  liveMode: boolean;
}

/** Thrown when Mercado Pago refuses a code or refresh token (revoked, expired, reused). */
export class OAuthGrantRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OAuthGrantRejectedError';
  }
}

/** Mercado Pago OAuth ("Connect"): an organization authorizes Velatrix to charge on its behalf. */
export interface MercadoPagoOAuthClient {
  authorizationUrl(input: { state: string; redirectUri: string }): string;
  exchangeCode(input: { code: string; redirectUri: string }): Promise<OAuthTokens>;
  refresh(refreshToken: string): Promise<OAuthTokens>;
  /** Nickname or email of the connected account, for display; null if unavailable. */
  accountLabel(accessToken: string): Promise<string | null>;
}
