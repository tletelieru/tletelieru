import { describe, expect, it } from 'vitest';
import { jwkToPem } from './jose/pem';
import { publicJwk } from './jose/keys';
import { rfc7515A2Key, rfc7515A2Token } from './jose/rfc-vectors';
import { encodeBase64Url } from './jwt';
import { lintJwt, type LintFinding } from './jwt-lint';

const NOW_S = 1_700_000_000;

function token(header: object, payload: object): string {
  return `${encodeBase64Url(JSON.stringify(header))}.${encodeBase64Url(JSON.stringify(payload))}.c2ln`;
}

function lint(tokenText: string, key = '', now: number | null = NOW_S * 1000): LintFinding[] {
  const result = lintJwt({ token: tokenText, key, encoding: 'text', now });
  if (!result.ok) throw new Error(result.error.code);
  return result.findings;
}

function codes(findings: LintFinding[]): string[] {
  return findings.map((finding) => finding.code);
}

const clean = { iat: NOW_S, exp: NOW_S + 3600 };

describe('lintJwt', () => {
  it('stays quiet on a clean asymmetric token', () => {
    expect(lint(token({ alg: 'RS256' }, clean))).toEqual([]);
  });

  it('flags alg none, missing and unknown algorithms', () => {
    expect(codes(lint(token({ alg: 'none' }, clean)))).toEqual(['alg-none']);
    expect(codes(lint(token({ alg: 'NoNe' }, clean)))).toEqual(['alg-none']);
    expect(codes(lint(token({}, clean)))).toEqual(['alg-missing']);
    expect(codes(lint(token({ alg: 'XS1' }, clean)))).toEqual(['alg-unknown']);
  });

  it('hints about confusion for HS tokens without a key', () => {
    expect(codes(lint(token({ alg: 'HS256' }, clean)))).toEqual(['alg-hs-hint']);
  });

  it('detects a public key offered for HS and a secret offered for RS', () => {
    const pem = jwkToPem(rfc7515A2Key, 'public') ?? '';
    expect(codes(lint(token({ alg: 'HS256' }, clean), pem))).toEqual(['alg-hs-public-key']);
    expect(codes(lint(rfc7515A2Token.replace(/\..*$/, '') + '.e30.c2ln', 'secret'))).toContain(
      'alg-asymmetric-secret',
    );
    const ec = '{"kty":"EC","crv":"P-256","x":"AA","y":"AA"}';
    expect(codes(lint(token({ alg: 'RS256' }, clean), ec))).toEqual(['alg-key-family']);
  });

  it('measures HS key length against the hash size', () => {
    expect(lint(token({ alg: 'HS256' }, clean), 'short')).toEqual([
      { severity: 'high', code: 'weak-hs-key', bytes: 5, minimum: 32 },
    ]);
    expect(lint(token({ alg: 'HS512' }, clean), 'x'.repeat(32))[0]).toMatchObject({
      code: 'weak-hs-key',
      minimum: 64,
    });
    expect(lint(token({ alg: 'HS256' }, clean), 'x'.repeat(32))).toEqual([]);
  });

  it('flags short RSA keys', () => {
    const key = JSON.stringify({ ...publicJwk(rfc7515A2Key), n: 'wwwwwwww' });
    expect(codes(lint(token({ alg: 'RS256' }, clean), key))).toEqual(['weak-rsa-key']);
  });

  it('reports unreadable keys without failing the lint', () => {
    expect(lint(token({ alg: 'RS256' }, clean), '{bad')).toEqual([
      { severity: 'low', code: 'key-unreadable', failure: 'key-json' },
    ]);
  });

  it('checks lifetimes and claim order', () => {
    expect(codes(lint(token({ alg: 'RS256' }, { iat: NOW_S })))).toEqual(['missing-exp']);
    expect(lint(token({ alg: 'RS256' }, { iat: NOW_S, exp: NOW_S + 90 * 86_400 }))).toEqual([
      { severity: 'medium', code: 'long-lifetime', days: 90 },
    ]);
    expect(codes(lint(token({ alg: 'RS256' }, { iat: NOW_S, exp: NOW_S - 1 })))).toEqual([
      'exp-before-iat',
      'expired',
    ]);
    expect(codes(lint(token({ alg: 'RS256' }, { nbf: NOW_S, exp: NOW_S })))).toEqual([
      'nbf-after-exp',
      'expired',
    ]);
    expect(codes(lint(token({ alg: 'RS256' }, { exp: 'soon' })))).toEqual(['invalid-claim']);
  });

  it('skips clock-based findings without a clock', () => {
    const past = token({ alg: 'RS256' }, { iat: NOW_S + 10, exp: NOW_S + 3600 });
    expect(codes(lint(past))).toEqual(['iat-future']);
    expect(lint(past, '', null)).toEqual([]);
    expect(lint(token({ alg: 'RS256' }, { exp: NOW_S + 90 * 86_400 }), '', null)).toEqual([]);
  });

  it('flags sensitive claims', () => {
    expect(lint(token({ alg: 'RS256' }, { ...clean, password: 'x' }))).toEqual([
      { severity: 'medium', code: 'sensitive-keys', keys: ['password'] },
    ]);
  });

  it('flags dangerous header parameters', () => {
    const findings = lint(
      token(
        {
          alg: 'RS256',
          jku: 'https://evil.example/jwks',
          x5u: 'https://evil.example/cert',
          jwk: { kty: 'RSA' },
          x5c: ['AA'],
          crit: ['foo'],
        },
        clean,
      ),
    );
    expect(codes(findings)).toEqual([
      'header-jku',
      'header-x5u',
      'header-jwk',
      'header-x5c',
      'header-crit',
    ]);
    expect(findings[0]).toMatchObject({ value: 'https://evil.example/jwks' });
  });

  it.each([
    ['../../dev/null', 'kid-traversal'],
    ['/etc/passwd', 'kid-traversal'],
    ["x' UNION SELECT 'a", 'kid-injection'],
    ['https://evil.example/key', 'kid-url'],
    ['2024-key-1', 'header-kid'],
  ])('classifies kid %s', (kid, code) => {
    expect(codes(lint(token({ alg: 'RS256', kid }, clean)))).toContain(code);
  });

  it('orders findings by severity', () => {
    const findings = lint(token({ alg: 'none', kid: 'a' }, { iat: NOW_S }));
    expect(findings.map((finding) => finding.severity)).toEqual(['high', 'medium', 'info']);
  });

  it('returns structural errors', () => {
    expect(lintJwt({ token: 'a.b', key: '', encoding: 'text', now: null })).toEqual({
      ok: false,
      error: { code: 'segments', count: 2 },
    });
  });
});
