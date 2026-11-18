import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verifies the `x-signature` header of a Mercado Pago webhook notification.
 *
 *   x-signature: ts=1704908010,v1=<hex hmac>
 *   manifest:    id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 *   v1 = HMAC-SHA256(manifest, webhook secret)
 *
 * `data.id` comes from the query string and is lower-cased when alphanumeric; parts whose
 * value is missing are left out of the manifest (Mercado Pago's documented rules).
 * Old notifications are rejected to limit replays.
 */
export function verifyMercadoPagoSignature(input: {
  secret: string;
  xSignature: string | undefined;
  xRequestId: string | undefined;
  dataId: string | undefined;
  /** Max age of the notification in seconds (default 10 minutes) */
  toleranceSeconds?: number;
  now?: Date;
}): boolean {
  if (!input.secret || !input.xSignature) return false;

  const parts = Object.fromEntries(
    input.xSignature.split(',').map((p) => {
      const [k, ...v] = p.split('=');
      return [k?.trim(), v.join('=').trim()];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1 || !/^\d+$/.test(ts) || !/^[0-9a-f]+$/i.test(v1)) return false;

  // ts may come in seconds or milliseconds
  const tsMs = ts.length > 11 ? Number(ts) : Number(ts) * 1000;
  const now = (input.now ?? new Date()).getTime();
  if (Math.abs(now - tsMs) > (input.toleranceSeconds ?? 600) * 1000) return false;

  const dataId = input.dataId && /^[a-z0-9]+$/i.test(input.dataId) ? input.dataId.toLowerCase() : input.dataId;
  let manifest = '';
  if (dataId) manifest += `id:${dataId};`;
  if (input.xRequestId) manifest += `request-id:${input.xRequestId};`;
  manifest += `ts:${ts};`;

  const expected = createHmac('sha256', input.secret).update(manifest).digest();
  const received = Buffer.from(v1, 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/** Builds a valid header (used by tests and local tooling). */
export function signMercadoPagoNotification(secret: string, dataId: string, requestId: string, ts: number): string {
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  return `ts=${ts},v1=${createHmac('sha256', secret).update(manifest).digest('hex')}`;
}
