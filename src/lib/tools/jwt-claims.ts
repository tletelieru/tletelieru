import { isObject } from './jose/encoding';
import { parseTimestamp } from './unix';

export const claimNames = ['exp', 'nbf', 'iat', 'iss', 'aud', 'sub', 'jti'] as const;
export type ClaimName = (typeof claimNames)[number];

export type ClaimStatus = 'pass' | 'warn' | 'fail' | 'info';

export type ClaimCode =
  | 'ok'
  | 'absent'
  | 'missing'
  | 'bad-type'
  | 'mismatch'
  | 'expired'
  | 'within-skew'
  | 'not-yet-valid'
  | 'future-iat'
  | 'unchecked';

export interface ClaimCheck {
  claim: ClaimName;
  status: ClaimStatus;
  code: ClaimCode;
  actual: unknown;
}

export interface ClaimExpectations {
  iss: string;
  aud: string;
  sub: string;
  jti: string;
  skewSeconds: number;
}

export interface ClaimsReport {
  checks: ClaimCheck[];
  overall: 'pass' | 'warn' | 'fail';
}

function isNumericDate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function expectedValues(text: string): string[] {
  return text
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value !== '');
}

function checkExp(actual: unknown, now: number, skew: number): ClaimCheck {
  const claim = 'exp';
  if (actual === undefined) return { claim, status: 'warn', code: 'absent', actual };
  if (!isNumericDate(actual)) return { claim, status: 'fail', code: 'bad-type', actual };
  if (now >= actual + skew) return { claim, status: 'fail', code: 'expired', actual };
  if (now >= actual) return { claim, status: 'warn', code: 'within-skew', actual };
  return { claim, status: 'pass', code: 'ok', actual };
}

function checkNbf(actual: unknown, now: number, skew: number): ClaimCheck {
  const claim = 'nbf';
  if (actual === undefined) return { claim, status: 'info', code: 'absent', actual };
  if (!isNumericDate(actual)) return { claim, status: 'fail', code: 'bad-type', actual };
  if (now < actual - skew) return { claim, status: 'fail', code: 'not-yet-valid', actual };
  if (now < actual) return { claim, status: 'warn', code: 'within-skew', actual };
  return { claim, status: 'pass', code: 'ok', actual };
}

function checkIat(actual: unknown, now: number, skew: number): ClaimCheck {
  const claim = 'iat';
  if (actual === undefined) return { claim, status: 'info', code: 'absent', actual };
  if (!isNumericDate(actual)) return { claim, status: 'fail', code: 'bad-type', actual };
  if (actual > now + skew) return { claim, status: 'fail', code: 'future-iat', actual };
  if (actual > now) return { claim, status: 'warn', code: 'within-skew', actual };
  return { claim, status: 'pass', code: 'ok', actual };
}

function checkString(claim: ClaimName, actual: unknown, expected: string): ClaimCheck {
  const wanted = expectedValues(expected);
  if (wanted.length === 0) {
    const code = actual === undefined ? 'absent' : 'unchecked';
    return { claim, status: 'info', code, actual };
  }
  if (actual === undefined) return { claim, status: 'fail', code: 'missing', actual };
  if (typeof actual !== 'string') return { claim, status: 'fail', code: 'bad-type', actual };
  if (!wanted.includes(actual)) return { claim, status: 'fail', code: 'mismatch', actual };
  return { claim, status: 'pass', code: 'ok', actual };
}

function checkAud(actual: unknown, expected: string): ClaimCheck {
  const claim = 'aud';
  const wanted = expectedValues(expected);
  const list = typeof actual === 'string' ? [actual] : actual;
  const wellFormed =
    Array.isArray(list) && list.every((value): value is string => typeof value === 'string');
  if (wanted.length === 0) {
    if (actual === undefined) return { claim, status: 'info', code: 'absent', actual };
    return wellFormed
      ? { claim, status: 'info', code: 'unchecked', actual }
      : { claim, status: 'fail', code: 'bad-type', actual };
  }
  if (actual === undefined) return { claim, status: 'fail', code: 'missing', actual };
  if (!wellFormed) return { claim, status: 'fail', code: 'bad-type', actual };
  const match = list.some((value) => wanted.includes(value));
  return { claim, status: match ? 'pass' : 'fail', code: match ? 'ok' : 'mismatch', actual };
}

export function checkClaims(
  payload: unknown,
  expected: ClaimExpectations,
  nowMs: number,
): ClaimsReport {
  const claims = isObject(payload) ? payload : {};
  const now = nowMs / 1000;
  const skew = Math.max(0, expected.skewSeconds);
  const checks = [
    checkExp(claims.exp, now, skew),
    checkNbf(claims.nbf, now, skew),
    checkIat(claims.iat, now, skew),
    checkString('iss', claims.iss, expected.iss),
    checkAud(claims.aud, expected.aud),
    checkString('sub', claims.sub, expected.sub),
    checkString('jti', claims.jti, expected.jti),
  ];
  const statuses = checks.map((check) => check.status);
  let overall: ClaimsReport['overall'] = 'pass';
  if (statuses.includes('fail')) overall = 'fail';
  else if (statuses.includes('warn')) overall = 'warn';
  return { checks, overall };
}

export function parseEvaluateAt(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const fromNumber = parseTimestamp(trimmed);
  if (fromNumber) return fromNumber.epochMs;
  const fromDate = Date.parse(trimmed);
  return Number.isNaN(fromDate) ? null : fromDate;
}
