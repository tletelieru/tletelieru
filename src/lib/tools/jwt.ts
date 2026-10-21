import { parseJson, stringifyJson, type JsonError } from './json';
import { formatZonedIso } from './time/zones';
import { formatRelative } from './unix';

export type JwtSegment = 'header' | 'payload' | 'signature';
export type JwtJsonSegment = Exclude<JwtSegment, 'signature'>;

export const timeClaims = ['exp', 'nbf', 'iat'] as const;
export type TimeClaim = (typeof timeClaims)[number];

export type JwtError =
  | { code: 'empty' }
  | { code: 'segments'; count: number }
  | { code: 'jwe' }
  | { code: 'base64'; segment: JwtSegment }
  | { code: 'utf8'; segment: JwtJsonSegment }
  | { code: 'json'; segment: JwtJsonSegment; detail: JsonError }
  | { code: 'not-object'; segment: JwtJsonSegment };

export type JwtWarning =
  | { code: 'alg-none' }
  | { code: 'missing-alg' }
  | { code: 'missing-exp' }
  | { code: 'long-lifetime'; days: number }
  | { code: 'invalid-claim'; claim: TimeClaim }
  | { code: 'sensitive-keys'; keys: string[] };

export type JwtStatus = 'valid' | 'expired' | 'not-yet-valid';

export interface JwtDecoded {
  token: string;
  parts: Record<JwtSegment, string>;
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  headerJson: string;
  payloadJson: string;
  alg: string | null;
  typ: string | null;
  claims: Partial<Record<TimeClaim, number>>;
  status: JwtStatus;
  warnings: JwtWarning[];
}

export type JwtResult = { ok: true; jwt: JwtDecoded } | { ok: false; error: JwtError };

export interface ClaimTime {
  claim: TimeClaim;
  seconds: number;
  utc: string;
  zoned: string;
  relative: string;
}

const MAX_MS = 8.64e15;
const DAY_SECONDS = 86_400;
const LONG_LIFETIME_DAYS = 30;

const SENSITIVE_EXACT = new Set(['pwd', 'pass', 'ssn', 'cvv', 'cvc', 'cvv2', 'pan', 'pin', 'rut']);
const SENSITIVE_PARTS = [
  'password',
  'passwd',
  'secret',
  'creditcard',
  'cardnumber',
  'card',
  'privatekey',
  'apikey',
  'accesskey',
  'iban',
  'socialsecurity',
  'accountnumber',
];

export function normalizeToken(input: string): string {
  return input
    .trim()
    .replace(/^authorization\s*:\s*/i, '')
    .replace(/^bearer\s+/i, '')
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, '');
}

export function decodeBase64Url(segment: string): Uint8Array | null {
  const unpadded = segment.replace(/=+$/, '');
  if (!/^[A-Za-z0-9_-]*$/.test(unpadded) || unpadded.length % 4 === 1) return null;
  const base64 = unpadded.replace(/-/g, '+').replace(/_/g, '/');
  try {
    const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

export function encodeBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

type SegmentResult =
  { ok: true; value: Record<string, unknown>; pretty: string } | { ok: false; error: JwtError };

function decodeJsonSegment(raw: string, segment: JwtJsonSegment): SegmentResult {
  const bytes = decodeBase64Url(raw);
  if (!bytes) return { ok: false, error: { code: 'base64', segment } };
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, error: { code: 'utf8', segment } };
  }
  const parsed = parseJson(text);
  if (!parsed.ok) return { ok: false, error: { code: 'json', segment, detail: parsed.error } };
  const value: unknown = JSON.parse(text);
  if (!isObject(value)) return { ok: false, error: { code: 'not-object', segment } };
  return { ok: true, value, pretty: stringifyJson(parsed.value, { indent: '2' }) };
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function isSensitiveKey(key: string): boolean {
  const normalized = normalizeKey(key);
  if (!normalized) return false;
  return (
    SENSITIVE_EXACT.has(normalized) || SENSITIVE_PARTS.some((part) => normalized.includes(part))
  );
}

export function findSensitiveKeys(value: unknown): string[] {
  const found = new Set<string>();
  const stack: unknown[] = [value];
  for (let current = stack.pop(); current !== undefined; current = stack.pop()) {
    if (Array.isArray(current)) {
      stack.push(...current);
    } else if (isObject(current)) {
      for (const [key, child] of Object.entries(current)) {
        if (isSensitiveKey(key)) found.add(key);
        stack.push(child);
      }
    }
  }
  return [...found].sort();
}

function isNumericDate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value * 1000) <= MAX_MS;
}

export function jwtStatus(claims: Partial<Record<TimeClaim, number>>, now: number): JwtStatus {
  if (claims.exp !== undefined && now >= claims.exp * 1000) return 'expired';
  if (claims.nbf !== undefined && now < claims.nbf * 1000) return 'not-yet-valid';
  return 'valid';
}

export function decodeJwt(input: string, now: number): JwtResult {
  const token = normalizeToken(input);
  if (!token) return { ok: false, error: { code: 'empty' } };
  const segments = token.split('.');
  if (segments.length === 5) return { ok: false, error: { code: 'jwe' } };
  if (segments.length !== 3)
    return { ok: false, error: { code: 'segments', count: segments.length } };
  const [rawHeader, rawPayload, signature] = segments as [string, string, string];

  const header = decodeJsonSegment(rawHeader, 'header');
  if (!header.ok) return header;
  const payload = decodeJsonSegment(rawPayload, 'payload');
  if (!payload.ok) return payload;
  if (decodeBase64Url(signature) === null) {
    return { ok: false, error: { code: 'base64', segment: 'signature' } };
  }

  const warnings: JwtWarning[] = [];
  const alg = typeof header.value.alg === 'string' ? header.value.alg : null;
  const typ = typeof header.value.typ === 'string' ? header.value.typ : null;
  if (alg === null) warnings.push({ code: 'missing-alg' });
  else if (alg.toLowerCase() === 'none') warnings.push({ code: 'alg-none' });

  const claims: Partial<Record<TimeClaim, number>> = {};
  for (const claim of timeClaims) {
    const value = payload.value[claim];
    if (value === undefined) continue;
    if (isNumericDate(value)) claims[claim] = value;
    else warnings.push({ code: 'invalid-claim', claim });
  }
  if (payload.value.exp === undefined) warnings.push({ code: 'missing-exp' });
  if (claims.exp !== undefined) {
    const start = claims.iat ?? claims.nbf ?? now / 1000;
    const days = (claims.exp - start) / DAY_SECONDS;
    if (days > LONG_LIFETIME_DAYS) warnings.push({ code: 'long-lifetime', days: Math.round(days) });
  }
  const sensitive = findSensitiveKeys(payload.value);
  if (sensitive.length > 0) warnings.push({ code: 'sensitive-keys', keys: sensitive });

  return {
    ok: true,
    jwt: {
      token,
      parts: { header: rawHeader, payload: rawPayload, signature },
      header: header.value,
      payload: payload.value,
      headerJson: header.pretty,
      payloadJson: payload.pretty,
      alg,
      typ,
      claims,
      status: jwtStatus(claims, now),
      warnings,
    },
  };
}

export function describeClaimTimes(
  claims: Partial<Record<TimeClaim, number>>,
  now: number,
  zone: string,
  locale = 'en',
): ClaimTime[] {
  return timeClaims.flatMap((claim) => {
    const seconds = claims[claim];
    if (seconds === undefined) return [];
    const epochMs = Math.round(seconds * 1000);
    return [
      {
        claim,
        seconds,
        utc: new Date(epochMs).toISOString(),
        zoned: formatZonedIso(epochMs, zone),
        relative: formatRelative(epochMs, now, locale),
      },
    ];
  });
}
