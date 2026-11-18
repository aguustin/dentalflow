import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export interface OAuthStatePayload {
  organizationId: string;
  userId: string;
}

const TTL_MS = 10 * 60 * 1000;

/**
 * OAuth `state`: signed (HMAC-SHA256) and short-lived. The callback is a public browser
 * redirect, so the state is the only proof of which organization started the connection.
 */
export function signOAuthState(payload: OAuthStatePayload, secret: string, now = Date.now()): string {
  const body = Buffer.from(
    JSON.stringify({ o: payload.organizationId, u: payload.userId, e: now + TTL_MS, n: randomBytes(8).toString('hex') }),
  ).toString('base64url');
  return `${body}.${sign(body, secret)}`;
}

/** Returns the payload, or null when forged, malformed or expired. */
export function verifyOAuthState(state: string | undefined, secret: string, now = Date.now()): OAuthStatePayload | null {
  if (!state) return null;
  const [body, signature] = state.split('.');
  if (!body || !signature) return null;
  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { o?: unknown; u?: unknown; e?: unknown };
    if (typeof p.o !== 'string' || typeof p.u !== 'string' || typeof p.e !== 'number' || p.e < now) return null;
    return { organizationId: p.o, userId: p.u };
  } catch {
    return null;
  }
}

function sign(body: string, secret: string): string {
  return createHmac('sha256', `oauth-state:${secret}`).update(body).digest('base64url');
}
