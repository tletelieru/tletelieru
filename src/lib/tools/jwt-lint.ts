import type { KeyEncoding } from './hash';
import { MIN_RSA_BITS, isJwsAlg, jwsSpecs } from './jose/algorithms';
import { modulusBits, octBytes, parseKeyMaterial, type Jwk, type KeyFailure } from './jose/keys';
import { decodeJwt, type JwtDecoded, type JwtError, type TimeClaim } from './jwt';

export type LintSeverity = 'high' | 'medium' | 'low' | 'info';

export type LintFinding = { severity: LintSeverity } & (
  | { code: 'alg-none' }
  | { code: 'alg-missing' }
  | { code: 'alg-unknown'; alg: string }
  | { code: 'alg-hs-public-key' }
  | { code: 'alg-asymmetric-secret' }
  | { code: 'alg-key-family'; alg: string; kty: string }
  | { code: 'alg-hs-hint' }
  | { code: 'key-unreadable'; failure: KeyFailure }
  | { code: 'weak-hs-key'; bytes: number; minimum: number }
  | { code: 'weak-rsa-key'; bits: number }
  | { code: 'missing-exp' }
  | { code: 'long-lifetime'; days: number }
  | { code: 'exp-before-iat' }
  | { code: 'nbf-after-exp' }
  | { code: 'invalid-claim'; claim: TimeClaim }
  | { code: 'expired' }
  | { code: 'iat-future' }
  | { code: 'sensitive-keys'; keys: string[] }
  | { code: 'header-jku'; value: string }
  | { code: 'header-x5u'; value: string }
  | { code: 'header-jwk' }
  | { code: 'header-x5c' }
  | { code: 'header-crit' }
  | { code: 'header-kid'; value: string }
  | { code: 'kid-traversal'; value: string }
  | { code: 'kid-injection'; value: string }
  | { code: 'kid-url'; value: string }
);

export interface LintInput {
  token: string;
  key: string;
  encoding: KeyEncoding;
  now: number | null;
}

export type LintResult =
  { ok: true; findings: LintFinding[]; alg: string | null } | { ok: false; error: JwtError };

const DAY_SECONDS = 86_400;
const LONG_LIFETIME_DAYS = 30;

const severityRank: Record<LintSeverity, number> = { high: 0, medium: 1, low: 2, info: 3 };

function lintAlg(jwt: JwtDecoded): LintFinding[] {
  const { alg } = jwt;
  if (alg === null) return [{ severity: 'high', code: 'alg-missing' }];
  if (alg.toLowerCase() === 'none') return [{ severity: 'high', code: 'alg-none' }];
  if (!isJwsAlg(alg)) return [{ severity: 'medium', code: 'alg-unknown', alg }];
  return [];
}

function lintKey(jwt: JwtDecoded, jwk: Jwk): LintFinding[] {
  const { alg } = jwt;
  if (!isJwsAlg(alg)) return [];
  const spec = jwsSpecs[alg];
  if (jwk.kty !== spec.family) {
    if (spec.family === 'oct') return [{ severity: 'high', code: 'alg-hs-public-key' }];
    if (jwk.kty === 'oct') return [{ severity: 'high', code: 'alg-asymmetric-secret' }];
    return [{ severity: 'high', code: 'alg-key-family', alg, kty: jwk.kty }];
  }
  if (spec.family === 'oct') {
    const bytes = octBytes(jwk)?.length ?? 0;
    if (bytes < spec.hashBytes) {
      return [{ severity: 'high', code: 'weak-hs-key', bytes, minimum: spec.hashBytes }];
    }
  }
  if (spec.family === 'RSA') {
    const bits = modulusBits(jwk) ?? 0;
    if (bits < MIN_RSA_BITS) return [{ severity: 'high', code: 'weak-rsa-key', bits }];
  }
  return [];
}

function lintKeys(jwt: JwtDecoded, input: LintInput): LintFinding[] {
  if (input.key.trim() === '') {
    return isJwsAlg(jwt.alg) && jwsSpecs[jwt.alg].family === 'oct'
      ? [{ severity: 'info', code: 'alg-hs-hint' }]
      : [];
  }
  const parsed = parseKeyMaterial(input.key, input.encoding);
  if (!parsed.ok) return [{ severity: 'low', code: 'key-unreadable', failure: parsed.error }];
  const kid = typeof jwt.header.kid === 'string' ? jwt.header.kid : null;
  const candidates = parsed.material.keys.filter((key) => kid === null || key.kid === kid);
  const keys = candidates.length > 0 ? candidates : parsed.material.keys;
  return keys.slice(0, 1).flatMap((key) => lintKey(jwt, key));
}

function lintTimes(jwt: JwtDecoded, now: number | null): LintFinding[] {
  const { exp, iat, nbf } = jwt.claims;
  const findings: LintFinding[] = [];
  if (exp !== undefined && iat !== undefined && exp <= iat) {
    findings.push({ severity: 'high', code: 'exp-before-iat' });
  }
  if (exp !== undefined && nbf !== undefined && nbf >= exp) {
    findings.push({ severity: 'medium', code: 'nbf-after-exp' });
  }
  const start = iat ?? nbf ?? (now === null ? undefined : now / 1000);
  if (exp !== undefined && start !== undefined) {
    const days = (exp - start) / DAY_SECONDS;
    if (days > LONG_LIFETIME_DAYS) {
      findings.push({ severity: 'medium', code: 'long-lifetime', days: Math.round(days) });
    }
  }
  if (now !== null && exp !== undefined && now >= exp * 1000) {
    findings.push({ severity: 'info', code: 'expired' });
  }
  if (now !== null && iat !== undefined && iat * 1000 > now) {
    findings.push({ severity: 'medium', code: 'iat-future' });
  }
  return findings;
}

function lintKid(kid: string): LintFinding[] {
  const findings: LintFinding[] = [];
  if (/(?:\.\.[/\\])|^[/\\]|^[a-z]:[/\\]|\0/i.test(kid)) {
    findings.push({ severity: 'high', code: 'kid-traversal', value: kid });
  }
  if (/['";`|$]|--|\/\*|\bunion\b|\bselect\b/i.test(kid)) {
    findings.push({ severity: 'high', code: 'kid-injection', value: kid });
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(kid)) {
    findings.push({ severity: 'medium', code: 'kid-url', value: kid });
  }
  if (findings.length === 0) findings.push({ severity: 'info', code: 'header-kid', value: kid });
  return findings;
}

function lintHeader(header: Record<string, unknown>): LintFinding[] {
  const findings: LintFinding[] = [];
  if (header.jku !== undefined) {
    findings.push({ severity: 'high', code: 'header-jku', value: String(header.jku) });
  }
  if (header.x5u !== undefined) {
    findings.push({ severity: 'high', code: 'header-x5u', value: String(header.x5u) });
  }
  if (header.jwk !== undefined) findings.push({ severity: 'high', code: 'header-jwk' });
  if (header.x5c !== undefined) findings.push({ severity: 'medium', code: 'header-x5c' });
  if (header.crit !== undefined) findings.push({ severity: 'medium', code: 'header-crit' });
  if (typeof header.kid === 'string') findings.push(...lintKid(header.kid));
  return findings;
}

function lintWarnings(jwt: JwtDecoded): LintFinding[] {
  return jwt.warnings.flatMap((warning): LintFinding[] => {
    if (warning.code === 'missing-exp') return [{ severity: 'medium', code: 'missing-exp' }];
    if (warning.code === 'invalid-claim') {
      return [{ severity: 'medium', code: 'invalid-claim', claim: warning.claim }];
    }
    if (warning.code === 'sensitive-keys') {
      return [{ severity: 'medium', code: 'sensitive-keys', keys: warning.keys }];
    }
    return [];
  });
}

export function lintJwt(input: LintInput): LintResult {
  const decoded = decodeJwt(input.token, input.now ?? 0);
  if (!decoded.ok) return { ok: false, error: decoded.error };
  const { jwt } = decoded;
  const findings = [
    ...lintAlg(jwt),
    ...lintKeys(jwt, input),
    ...lintHeader(jwt.header),
    ...lintWarnings(jwt),
    ...lintTimes(jwt, input.now),
  ];
  findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
  return { ok: true, findings, alg: jwt.alg };
}
