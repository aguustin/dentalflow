/**
 * Detects the real type of an uploaded file from its first bytes ("magic numbers").
 * The client-declared MIME type is not trusted. Only these types are accepted.
 */
const SIGNATURES: { mime: string; test: (b: Buffer) => boolean }[] = [
  { mime: 'image/jpeg', test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: 'image/png',
    test: (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mime: 'image/webp',
    test: (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
  },
  { mime: 'application/pdf', test: (b) => b.length > 5 && b.toString('ascii', 0, 5) === '%PDF-' },
];

export const ALLOWED_TYPES_LABEL = 'JPG, PNG, WEBP o PDF';

export function detectFileType(data: Buffer): string | null {
  return SIGNATURES.find((s) => s.test(data))?.mime ?? null;
}
