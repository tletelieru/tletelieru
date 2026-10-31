import { toBase64, type Bytes } from '../hash';
import { decodeBase64Url } from '../jwt';

export function bytesToBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlToBytes(text: string): Bytes | null {
  const decoded = decodeBase64Url(text);
  if (decoded === null) return null;
  const bytes = new Uint8Array(decoded);
  return bytesToBase64Url(bytes) === text ? bytes : null;
}

export function concatBytes(...parts: readonly Uint8Array[]): Bytes {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
