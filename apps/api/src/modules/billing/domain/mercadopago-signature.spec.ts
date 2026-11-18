import { signMercadoPagoNotification, verifyMercadoPagoSignature } from './mercadopago-signature';

const secret = 'test-secret';
const now = new Date('2026-11-18T12:00:00Z');
const ts = Math.floor(now.getTime() / 1000);

describe('verifyMercadoPagoSignature', () => {
  const valid = (overrides: Partial<Parameters<typeof verifyMercadoPagoSignature>[0]> = {}) =>
    verifyMercadoPagoSignature({
      secret,
      xSignature: signMercadoPagoNotification(secret, 'abc123', 'req-1', ts),
      xRequestId: 'req-1',
      dataId: 'ABC123', // alphanumeric ids are lower-cased in the manifest
      now,
      ...overrides,
    });

  it('accepts a correctly signed, recent notification', () => {
    expect(valid()).toBe(true);
  });

  it('rejects a wrong secret, a tampered id or request id', () => {
    expect(valid({ secret: 'other' })).toBe(false);
    expect(valid({ dataId: 'abc124' })).toBe(false);
    expect(valid({ xRequestId: 'req-2' })).toBe(false);
  });

  it('rejects missing or malformed headers and an empty secret', () => {
    expect(valid({ xSignature: undefined })).toBe(false);
    expect(valid({ xSignature: 'garbage' })).toBe(false);
    expect(valid({ xSignature: `ts=${ts},v1=zz` })).toBe(false);
    expect(valid({ secret: '' })).toBe(false);
  });

  it('rejects old notifications (replay)', () => {
    expect(valid({ now: new Date(now.getTime() + 11 * 60_000) })).toBe(false);
  });
});
