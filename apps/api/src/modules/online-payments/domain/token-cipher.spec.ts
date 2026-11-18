import { randomBytes } from 'crypto';
import { TokenCipher } from './token-cipher';
import { signOAuthState, verifyOAuthState } from './oauth-state';

const key = () => randomBytes(32).toString('base64');

describe('TokenCipher', () => {
  const cipher = TokenCipher.fromBase64(key())!;

  it('round-trips and never stores the plain token', () => {
    const enc = cipher.encrypt('APP_USR-secret-token', 'org-1');
    expect(enc).not.toContain('secret');
    expect(cipher.decrypt(enc, 'org-1')).toBe('APP_USR-secret-token');
  });

  it('rejects a ciphertext moved to another organization, tampered or under another key', () => {
    const enc = cipher.encrypt('APP_USR-secret-token', 'org-1');
    expect(() => cipher.decrypt(enc, 'org-2')).toThrow();
    const parts = enc.split('.');
    parts[3] = Buffer.from('APP_USR-forged-token').toString('base64url');
    expect(() => cipher.decrypt(parts.join('.'), 'org-1')).toThrow();
    expect(() => TokenCipher.fromBase64(key())!.decrypt(enc, 'org-1')).toThrow();
  });

  it('refuses keys that are not 32 bytes', () => {
    expect(() => TokenCipher.fromBase64(Buffer.from('short').toString('base64'))).toThrow();
    expect(TokenCipher.fromBase64(undefined)).toBeNull();
  });
});

describe('OAuth state', () => {
  const payload = { organizationId: 'org-1', userId: 'user-1' };

  it('verifies its own state', () => {
    expect(verifyOAuthState(signOAuthState(payload, 's'), 's')).toEqual(payload);
  });

  it('rejects forged, re-signed with another secret, or expired states', () => {
    const state = signOAuthState(payload, 's');
    const [, sig] = state.split('.');
    const forgedBody = Buffer.from(JSON.stringify({ o: 'org-2', u: 'user-1', e: Date.now() + 60_000, n: 'x' })).toString(
      'base64url',
    );
    expect(verifyOAuthState(`${forgedBody}.${sig}`, 's')).toBeNull();
    expect(verifyOAuthState(state, 'other')).toBeNull();
    expect(verifyOAuthState(state, 's', Date.now() + 11 * 60 * 1000)).toBeNull();
    expect(verifyOAuthState(undefined, 's')).toBeNull();
  });
});
