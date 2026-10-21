import { hmacMd5, md5 } from './hash/md5';

export const hashAlgorithms = ['md5', 'sha1', 'sha256', 'sha384', 'sha512'] as const;
export type HashAlgorithm = (typeof hashAlgorithms)[number];

export const hashFormats = ['hex', 'HEX', 'base64'] as const;
export type HashFormat = (typeof hashFormats)[number];

export const keyEncodings = ['text', 'hex', 'base64'] as const;
export type KeyEncoding = (typeof keyEncodings)[number];

export type Bytes = Uint8Array<ArrayBuffer>;
export type DigestSet = Record<HashAlgorithm, Bytes>;

export const algorithmNames: Record<HashAlgorithm, string> = {
  md5: 'MD5',
  sha1: 'SHA-1',
  sha256: 'SHA-256',
  sha384: 'SHA-384',
  sha512: 'SHA-512',
};

const subtleNames: Record<Exclude<HashAlgorithm, 'md5'>, string> = {
  sha1: 'SHA-1',
  sha256: 'SHA-256',
  sha384: 'SHA-384',
  sha512: 'SHA-512',
};

export type KeyDecodeResult =
  { ok: true; bytes: Bytes } | { ok: false; error: 'invalid-hex' | 'invalid-base64' };

export type VerifyResult =
  | { status: 'empty' }
  | { status: 'match'; algorithm: HashAlgorithm; format: 'hex' | 'base64' }
  | { status: 'mismatch'; candidates: HashAlgorithm[] };

export function isHashAlgorithm(value: unknown): value is HashAlgorithm {
  return typeof value === 'string' && (hashAlgorithms as readonly string[]).includes(value);
}

export function isHashFormat(value: unknown): value is HashFormat {
  return typeof value === 'string' && (hashFormats as readonly string[]).includes(value);
}

export function isKeyEncoding(value: unknown): value is KeyEncoding {
  return typeof value === 'string' && (keyEncodings as readonly string[]).includes(value);
}

export function utf8(text: string): Bytes {
  return new TextEncoder().encode(text);
}

export function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
  return out;
}

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

export function fromHex(text: string): Bytes | null {
  const clean = text.replace(/\s+/g, '').replace(/^0x/i, '');
  if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(clean)) return null;
  const out = new Uint8Array(clean.length / 2);
  for (let index = 0; index < out.length; index++) {
    out[index] = parseInt(clean.slice(index * 2, index * 2 + 2), 16);
  }
  return out;
}

export function fromBase64(text: string): Bytes | null {
  const clean = text.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) return null;
  const unpadded = clean.replace(/=+$/, '');
  if (unpadded.length % 4 === 1) return null;
  try {
    const binary = atob(unpadded + '='.repeat((4 - (unpadded.length % 4)) % 4));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

export function decodeKey(text: string, encoding: KeyEncoding): KeyDecodeResult {
  if (encoding === 'text') return { ok: true, bytes: utf8(text) };
  if (encoding === 'hex') {
    const bytes = fromHex(text);
    return bytes ? { ok: true, bytes } : { ok: false, error: 'invalid-hex' };
  }
  const bytes = fromBase64(text);
  return bytes ? { ok: true, bytes } : { ok: false, error: 'invalid-base64' };
}

export function encodeDigest(bytes: Uint8Array, format: HashFormat): string {
  if (format === 'base64') return toBase64(bytes);
  const hex = toHex(bytes);
  return format === 'HEX' ? hex.toUpperCase() : hex;
}

export async function digest(algorithm: HashAlgorithm, data: Bytes): Promise<Bytes> {
  if (algorithm === 'md5') return md5(data) as Bytes;
  return new Uint8Array(await crypto.subtle.digest(subtleNames[algorithm], data));
}

export async function hmac(algorithm: HashAlgorithm, key: Bytes, data: Bytes): Promise<Bytes> {
  if (algorithm === 'md5') return hmacMd5(key, data) as Bytes;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key.length > 0 ? key : new Uint8Array(1),
    { name: 'HMAC', hash: subtleNames[algorithm] },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, data));
}

async function collect(compute: (algorithm: HashAlgorithm) => Promise<Bytes>): Promise<DigestSet> {
  const values = await Promise.all(hashAlgorithms.map(compute));
  return Object.fromEntries(
    hashAlgorithms.map((algorithm, index) => [algorithm, values[index]]),
  ) as DigestSet;
}

export function digestAll(data: Bytes): Promise<DigestSet> {
  return collect((algorithm) => digest(algorithm, data));
}

export function hmacAll(key: Bytes, data: Bytes): Promise<DigestSet> {
  return collect((algorithm) => hmac(algorithm, key, data));
}

const DIGEST_LENGTHS: Record<HashAlgorithm, number> = {
  md5: 16,
  sha1: 20,
  sha256: 32,
  sha384: 48,
  sha512: 64,
};

export function guessAlgorithms(expected: string): HashAlgorithm[] {
  const clean = expected.replace(/\s+/g, '');
  const bytes = /^[0-9a-fA-F]+$/.test(clean) ? fromHex(clean) : fromBase64(clean);
  if (!bytes) return [];
  return hashAlgorithms.filter((algorithm) => DIGEST_LENGTHS[algorithm] === bytes.length);
}

export function verifyDigest(expected: string, digests: DigestSet): VerifyResult {
  const clean = expected.replace(/\s+/g, '');
  if (!clean) return { status: 'empty' };
  const lower = clean.toLowerCase().replace(/^0x/, '');
  const base64 = clean.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  for (const algorithm of hashAlgorithms) {
    const bytes = digests[algorithm];
    if (toHex(bytes) === lower) return { status: 'match', algorithm, format: 'hex' };
    if (toBase64(bytes).replace(/=+$/, '') === base64) {
      return { status: 'match', algorithm, format: 'base64' };
    }
  }
  return { status: 'mismatch', candidates: guessAlgorithms(clean) };
}
