export type Base64Variant = 'standard' | 'url';

export type DecodeResult = { ok: true; text: string } | { ok: false; reason: 'invalid' | 'utf8' };

const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

export function encodeBase64(text: string, variant: Base64Variant = 'standard'): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const encoded = btoa(binary);
  if (variant === 'standard') return encoded;
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeBase64(text: string): DecodeResult {
  const clean = text.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  if (!BASE64.test(clean)) return { ok: false, reason: 'invalid' };
  const body = clean.replace(/=+$/, '');
  if (body.length % 4 === 1) return { ok: false, reason: 'invalid' };
  const padded = body + '='.repeat((4 - (body.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  try {
    return { ok: true, text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, reason: 'utf8' };
  }
}

export type UrlEncodeMode = 'component' | 'uri';

export function encodeUrl(text: string, mode: UrlEncodeMode = 'component'): string | null {
  try {
    return mode === 'uri' ? encodeURI(text) : encodeURIComponent(text);
  } catch {
    return null;
  }
}

export function decodeUrl(text: string, plusAsSpace = false): string | null {
  try {
    return decodeURIComponent(plusAsSpace ? text.replace(/\+/g, ' ') : text);
  } catch {
    return null;
  }
}
