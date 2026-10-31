import { describe, expect, it } from 'vitest';
import {
  checkClaims,
  parseEvaluateAt,
  type ClaimExpectations,
  type ClaimName,
  type ClaimsReport,
} from './jwt-claims';

const NOW_S = 1_700_000_000;
const NOW = NOW_S * 1000;

const none: ClaimExpectations = { iss: '', aud: '', sub: '', jti: '', skewSeconds: 0 };

function check(report: ClaimsReport, claim: ClaimName) {
  const found = report.checks.find((item) => item.claim === claim);
  if (!found) throw new Error(`missing ${claim}`);
  return { status: found.status, code: found.code };
}

describe('checkClaims time claims', () => {
  it('passes a current token', () => {
    const report = checkClaims({ exp: NOW_S + 60, nbf: NOW_S - 60, iat: NOW_S - 60 }, none, NOW);
    expect(report.overall).toBe('pass');
    expect(check(report, 'exp')).toEqual({ status: 'pass', code: 'ok' });
  });

  it('treats exp as exclusive and applies the skew', () => {
    expect(check(checkClaims({ exp: NOW_S }, none, NOW), 'exp').code).toBe('expired');
    const skewed = checkClaims({ exp: NOW_S - 30 }, { ...none, skewSeconds: 60 }, NOW);
    expect(check(skewed, 'exp')).toEqual({ status: 'warn', code: 'within-skew' });
    expect(skewed.overall).toBe('warn');
    const past = checkClaims({ exp: NOW_S - 60 }, { ...none, skewSeconds: 60 }, NOW);
    expect(check(past, 'exp').code).toBe('expired');
    expect(past.overall).toBe('fail');
  });

  it('checks nbf and iat against the skew', () => {
    expect(check(checkClaims({ nbf: NOW_S + 1 }, none, NOW), 'nbf').code).toBe('not-yet-valid');
    expect(
      check(checkClaims({ nbf: NOW_S + 30 }, { ...none, skewSeconds: 60 }, NOW), 'nbf'),
    ).toEqual({ status: 'warn', code: 'within-skew' });
    expect(check(checkClaims({ nbf: NOW_S }, none, NOW), 'nbf').code).toBe('ok');
    expect(check(checkClaims({ iat: NOW_S + 1 }, none, NOW), 'iat').code).toBe('future-iat');
    expect(check(checkClaims({ iat: NOW_S }, none, NOW), 'iat').code).toBe('ok');
  });

  it('flags missing exp and non-numeric dates', () => {
    expect(check(checkClaims({}, none, NOW), 'exp')).toEqual({ status: 'warn', code: 'absent' });
    expect(check(checkClaims({ exp: '1' }, none, NOW), 'exp').code).toBe('bad-type');
    expect(check(checkClaims({ iat: null }, none, NOW), 'iat').code).toBe('bad-type');
    expect(check(checkClaims({ nbf: [] }, none, NOW), 'nbf').code).toBe('bad-type');
  });

  it('treats a negative skew as zero', () => {
    const report = checkClaims({ exp: NOW_S + 10 }, { ...none, skewSeconds: -100 }, NOW);
    expect(check(report, 'exp').code).toBe('ok');
  });
});

describe('checkClaims identity claims', () => {
  it('compares iss, sub and jti exactly', () => {
    const expected = { ...none, iss: 'https://a.example', sub: 'u1', jti: 'j1' };
    const pass = checkClaims(
      { exp: NOW_S + 1, iss: 'https://a.example', sub: 'u1', jti: 'j1' },
      expected,
      NOW,
    );
    expect(pass.overall).toBe('pass');
    const fail = checkClaims(
      { exp: NOW_S + 1, iss: 'https://a.example/', sub: 'U1' },
      expected,
      NOW,
    );
    expect(check(fail, 'iss').code).toBe('mismatch');
    expect(check(fail, 'sub').code).toBe('mismatch');
    expect(check(fail, 'jti').code).toBe('missing');
  });

  it('accepts a comma-separated allow list', () => {
    const report = checkClaims({ iss: 'b' }, { ...none, iss: 'a, b' }, NOW);
    expect(check(report, 'iss').code).toBe('ok');
  });

  it('matches aud as a string or any member of an array', () => {
    const expected = { ...none, aud: 'api, web' };
    expect(check(checkClaims({ aud: 'web' }, expected, NOW), 'aud').code).toBe('ok');
    expect(check(checkClaims({ aud: ['x', 'api'] }, expected, NOW), 'aud').code).toBe('ok');
    expect(check(checkClaims({ aud: ['x'] }, expected, NOW), 'aud').code).toBe('mismatch');
    expect(check(checkClaims({ aud: [1] }, expected, NOW), 'aud').code).toBe('bad-type');
    expect(check(checkClaims({}, expected, NOW), 'aud').code).toBe('missing');
  });

  it('only reports values when nothing is expected', () => {
    const report = checkClaims({ exp: NOW_S + 1, iss: 'x', aud: ['y'] }, none, NOW);
    expect(check(report, 'iss')).toEqual({ status: 'info', code: 'unchecked' });
    expect(check(report, 'aud')).toEqual({ status: 'info', code: 'unchecked' });
    expect(check(report, 'sub')).toEqual({ status: 'info', code: 'absent' });
    expect(report.overall).toBe('pass');
  });
});

describe('parseEvaluateAt', () => {
  it('reads seconds, milliseconds and ISO dates', () => {
    expect(parseEvaluateAt('1700000000')).toBe(1_700_000_000_000);
    expect(parseEvaluateAt('1700000000000')).toBe(1_700_000_000_000);
    expect(parseEvaluateAt('2023-11-14T22:13:20Z')).toBe(1_700_000_000_000);
  });

  it('returns null for empty or invalid input', () => {
    expect(parseEvaluateAt('  ')).toBeNull();
    expect(parseEvaluateAt('soon')).toBeNull();
  });
});
