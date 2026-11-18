import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts provider credentials at rest (AES-256-GCM).
 *
 * `context` (the organization id) is authenticated additional data: a ciphertext copied to
 * another organization's row fails to decrypt. Format: v1.<iv>.<tag>.<ciphertext> (base64url);
 * the version prefix allows key rotation later.
 */
export class TokenCipher {
  private constructor(private readonly key: Buffer) {}

  /** Key: 32 random bytes in base64 (`openssl rand -base64 32`). */
  static fromBase64(keyBase64: string | undefined): TokenCipher | null {
    if (!keyBase64) return null;
    const key = Buffer.from(keyBase64, 'base64');
    if (key.length !== 32) throw new Error('PAYMENT_TOKENS_KEY must be 32 bytes encoded in base64');
    return new TokenCipher(key);
  }

  encrypt(plain: string, context: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    cipher.setAAD(Buffer.from(context, 'utf8'));
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [VERSION, iv.toString('base64url'), tag.toString('base64url'), data.toString('base64url')].join('.');
  }

  /** Throws if the payload was tampered with, belongs to another context or another key. */
  decrypt(payload: string, context: string): string {
    const [version, iv, tag, data] = payload.split('.');
    if (version !== VERSION || !iv || !tag || data === undefined) throw new Error('Unsupported encrypted payload');
    const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(iv, 'base64url'));
    decipher.setAAD(Buffer.from(context, 'utf8'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
  }
}
