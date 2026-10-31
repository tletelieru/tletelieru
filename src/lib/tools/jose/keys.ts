import { decodeKey, utf8, type Bytes, type KeyEncoding } from '../hash';
import { parseJsonValue } from '../json';
import { MIN_RSA_BITS, curveBytes, isCurve, type Curve, type KeyFamily } from './algorithms';
import { base64UrlToBytes, bytesToBase64Url, isObject } from './encoding';
import { pemToJwk, type Jwk, type PemError } from './pem';

export type { Jwk } from './pem';

export type KeyFailure =
  | PemError
  | 'key-empty'
  | 'key-json'
  | 'key-not-jwk'
  | 'key-jwks-empty'
  | 'key-encoding'
  | 'key-invalid'
  | 'key-type'
  | 'key-curve'
  | 'key-use'
  | 'key-alg'
  | 'key-size'
  | 'key-public'
  | 'kid-not-found'
  | 'kid-ambiguous';

export type KeySource = 'secret' | 'pem' | 'jwk' | 'jwks';

export interface KeyMaterial {
  source: KeySource;
  keys: Jwk[];
}

export type KeyParse = { ok: true; material: KeyMaterial } | { ok: false; error: KeyFailure };

export interface KeyRequirement {
  family: KeyFamily;
  algs: readonly string[];
  kid: string | null;
  curve?: Curve | null;
  use: 'sig' | 'enc';
  ops: readonly string[];
  needsPrivate?: boolean;
}

const PEM_MARKER = /-----(?:BEGIN|END) /;
const PRIVATE_FIELDS = new Set(['d', 'p', 'q', 'dp', 'dq', 'qi', 'key_ops']);

function looksLikePem(text: string): boolean {
  return text.startsWith('-----') || PEM_MARKER.test(text);
}

export function looksLikeSecret(text: string): boolean {
  const trimmed = text.trim();
  return !looksLikePem(trimmed) && !trimmed.startsWith('{');
}

function parseJwkText(text: string): KeyParse {
  const parsed = parseJsonValue(text);
  if (!parsed.ok) return { ok: false, error: 'key-json' };
  const value = parsed.value;
  if (!isObject(value)) return { ok: false, error: 'key-not-jwk' };
  if (Array.isArray(value.keys)) {
    const keys = value.keys.filter(
      (key): key is Jwk => isObject(key) && typeof key.kty === 'string',
    );
    if (keys.length === 0) return { ok: false, error: 'key-jwks-empty' };
    return { ok: true, material: { source: 'jwks', keys } };
  }
  if (typeof value.kty !== 'string') return { ok: false, error: 'key-not-jwk' };
  return { ok: true, material: { source: 'jwk', keys: [value as unknown as Jwk] } };
}

function secretBytes(text: string, encoding: KeyEncoding): Bytes | null {
  if (encoding === 'text') return utf8(text.replace(/\r?\n$/, ''));
  const decoded = decodeKey(text.trim(), encoding);
  return decoded.ok ? decoded.bytes : null;
}

export function parseKeyMaterial(text: string, encoding: KeyEncoding = 'text'): KeyParse {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: false, error: 'key-empty' };
  if (looksLikePem(trimmed)) {
    const pem = pemToJwk(trimmed);
    if (!pem.ok) return { ok: false, error: pem.error };
    return { ok: true, material: { source: 'pem', keys: [pem.jwk] } };
  }
  if (trimmed.startsWith('{')) return parseJwkText(trimmed);
  const bytes = secretBytes(text, encoding);
  if (!bytes || bytes.length === 0) return { ok: false, error: 'key-encoding' };
  return {
    ok: true,
    material: { source: 'secret', keys: [{ kty: 'oct', k: bytesToBase64Url(bytes) }] },
  };
}

export function octetLength(value: string | undefined): number | null {
  if (value === undefined) return null;
  return base64UrlToBytes(value)?.length ?? null;
}

export function modulusBits(jwk: Jwk): number | null {
  const bytes = jwk.n === undefined ? null : base64UrlToBytes(jwk.n);
  if (!bytes) return null;
  const first = bytes.findIndex((byte) => byte !== 0);
  if (first === -1) return null;
  return (bytes.length - first - 1) * 8 + (32 - Math.clz32(bytes[first] ?? 0));
}

export function octBytes(jwk: Jwk): Bytes | null {
  return jwk.k === undefined ? null : base64UrlToBytes(jwk.k);
}

export function isPrivateJwk(jwk: Jwk): boolean {
  return jwk.kty !== 'oct' && jwk.d !== undefined;
}

export function publicJwk(jwk: Jwk): Jwk {
  const entries = Object.entries(jwk).filter(([name]) => !PRIVATE_FIELDS.has(name));
  return Object.fromEntries(entries) as unknown as Jwk;
}

function validRsa(jwk: Jwk): boolean {
  if (modulusBits(jwk) === null) return false;
  if ((octetLength(jwk.e) ?? 0) === 0) return false;
  return jwk.d === undefined || (octetLength(jwk.d) ?? 0) > 0;
}

function validEc(jwk: Jwk): boolean {
  if (!isCurve(jwk.crv)) return false;
  const size = curveBytes[jwk.crv];
  if (octetLength(jwk.x) !== size || octetLength(jwk.y) !== size) return false;
  return jwk.d === undefined || octetLength(jwk.d) === size;
}

export function validateJwk(jwk: Jwk): 'key-invalid' | 'key-unsupported' | null {
  if (jwk.kty === 'oct') return (octBytes(jwk)?.length ?? 0) > 0 ? null : 'key-invalid';
  if (jwk.kty === 'RSA') return validRsa(jwk) ? null : 'key-invalid';
  if (jwk.kty !== 'EC') return 'key-unsupported';
  if (typeof jwk.crv === 'string' && !isCurve(jwk.crv)) return 'key-unsupported';
  return validEc(jwk) ? null : 'key-invalid';
}

function fitsUse(jwk: Jwk, wanted: KeyRequirement): boolean {
  if (jwk.use !== undefined && jwk.use !== wanted.use) return false;
  if (jwk.key_ops === undefined) return true;
  return Array.isArray(jwk.key_ops) && wanted.ops.some((op) => jwk.key_ops?.includes(op));
}

export function checkKey(jwk: Jwk, wanted: KeyRequirement): KeyFailure | null {
  if (jwk.kty !== 'oct' && jwk.kty !== 'RSA' && jwk.kty !== 'EC') return 'key-unsupported';
  if (jwk.kty !== wanted.family) return 'key-type';
  if (jwk.alg !== undefined && !wanted.algs.includes(jwk.alg)) return 'key-alg';
  if (!fitsUse(jwk, wanted)) return 'key-use';
  const invalid = validateJwk(jwk);
  if (invalid) return invalid;
  if (wanted.curve && jwk.crv !== wanted.curve) return 'key-curve';
  if (jwk.kty === 'RSA' && (modulusBits(jwk) ?? 0) < MIN_RSA_BITS) return 'key-size';
  if (wanted.needsPrivate && jwk.kty !== 'oct' && !isPrivateJwk(jwk)) return 'key-public';
  return null;
}

export function selectKey(material: KeyMaterial, wanted: KeyRequirement): Jwk | KeyFailure {
  const [first] = material.keys;
  if (material.source !== 'jwks') {
    if (!first) return 'key-empty';
    return checkKey(first, wanted) ?? first;
  }
  const byKid =
    wanted.kid === null ? material.keys : material.keys.filter((key) => key.kid === wanted.kid);
  if (wanted.kid !== null && byKid.length === 0) return 'kid-not-found';
  const usable = byKid.filter((key) => checkKey(key, wanted) === null);
  if (usable.length > 1) return 'kid-ambiguous';
  const [only] = usable;
  if (only) return only;
  const [candidate] = byKid;
  return (candidate && checkKey(candidate, wanted)) ?? 'key-type';
}
