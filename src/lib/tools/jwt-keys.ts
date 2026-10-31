import { toHex } from './hash';
import type { Curve } from './jose/algorithms';
import { bytesToBase64Url } from './jose/encoding';
import {
  isPrivateJwk,
  parseKeyMaterial,
  publicJwk,
  validateJwk,
  type Jwk,
  type KeyFailure,
} from './jose/keys';
import { jwkToPem } from './jose/pem';

export const testKeyKinds = [
  'rsa-2048',
  'rsa-3072',
  'rsa-4096',
  'ec-p256',
  'ec-p384',
  'ec-p521',
  'hmac-256',
  'hmac-384',
  'hmac-512',
] as const;
export type TestKeyKind = (typeof testKeyKinds)[number];

export interface ConvertedKey {
  from: 'pem' | 'jwk' | 'jwks';
  jwk: string;
  pem: string;
  publicJwk: string;
  publicPem: string;
  hasPrivate: boolean;
}

export type ConvertResult = { ok: true; key: ConvertedKey } | { ok: false; error: KeyFailure };

export interface TestKey {
  kind: TestKeyKind;
  jwk: string;
  pem: string;
  publicJwk: string;
  publicPem: string;
  secretHex: string;
}

const RSA_BITS: Partial<Record<TestKeyKind, number>> = {
  'rsa-2048': 2048,
  'rsa-3072': 3072,
  'rsa-4096': 4096,
};

const EC_CURVES: Partial<Record<TestKeyKind, Curve>> = {
  'ec-p256': 'P-256',
  'ec-p384': 'P-384',
  'ec-p521': 'P-521',
};

const HMAC_BYTES: Partial<Record<TestKeyKind, number>> = {
  'hmac-256': 32,
  'hmac-384': 48,
  'hmac-512': 64,
};

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function render(keys: Jwk[], from: 'jwks' | 'jwk' | 'pem'): string {
  return pretty(from === 'jwks' ? { keys } : keys[0]);
}

function pemFor(jwk: Jwk): string {
  return jwkToPem(jwk, isPrivateJwk(jwk) ? 'private' : 'public') ?? '';
}

export function convertKey(text: string): ConvertResult {
  const parsed = parseKeyMaterial(text);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const { source, keys } = parsed.material;
  if (source === 'secret') return { ok: false, error: 'key-not-jwk' };
  for (const key of keys) {
    const invalid = validateJwk(key);
    if (invalid) return { ok: false, error: invalid };
  }
  const asymmetric = keys.filter((key) => key.kty !== 'oct');
  if (asymmetric.some((key) => pemFor(key) === '')) return { ok: false, error: 'key-unsupported' };
  const hasPrivate = asymmetric.some(isPrivateJwk);
  return {
    ok: true,
    key: {
      from: source,
      jwk: render(keys, source),
      pem: asymmetric.map(pemFor).join('\n'),
      publicJwk: hasPrivate ? render(asymmetric.map(publicJwk), source) : '',
      publicPem: hasPrivate
        ? asymmetric.map((key) => jwkToPem(key, 'public') ?? '').join('\n')
        : '',
      hasPrivate,
    },
  };
}

function cleanExport({ kty, crv, x, y, n, e, d, p, q, dp, dq, qi }: JsonWebKey): Jwk {
  const entries = Object.entries({ kty, crv, x, y, n, e, d, p, q, dp, dq, qi });
  return Object.fromEntries(entries.filter(([, value]) => value !== undefined)) as unknown as Jwk;
}

function pairToTestKey(kind: TestKeyKind, jwk: Jwk): TestKey {
  return {
    kind,
    jwk: pretty(jwk),
    pem: jwkToPem(jwk, 'private') ?? '',
    publicJwk: pretty(publicJwk(jwk)),
    publicPem: jwkToPem(jwk, 'public') ?? '',
    secretHex: '',
  };
}

function hmacTestKey(kind: TestKeyKind, size: number): TestKey {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  const jwk: Jwk = { kty: 'oct', k: bytesToBase64Url(bytes) };
  return { kind, jwk: pretty(jwk), pem: '', publicJwk: '', publicPem: '', secretHex: toHex(bytes) };
}

export async function generateTestKey(kind: TestKeyKind): Promise<TestKey> {
  const hmacBytes = HMAC_BYTES[kind];
  if (hmacBytes !== undefined) return hmacTestKey(kind, hmacBytes);
  const curve = EC_CURVES[kind];
  const algorithm = curve
    ? { name: 'ECDSA', namedCurve: curve }
    : {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: RSA_BITS[kind] ?? 2048,
        publicExponent: Uint8Array.of(1, 0, 1),
        hash: 'SHA-256',
      };
  const pair = await crypto.subtle.generateKey(algorithm, true, ['sign', 'verify']);
  const exported = await crypto.subtle.exportKey('jwk', pair.privateKey);
  return pairToTestKey(kind, cleanExport(exported));
}
