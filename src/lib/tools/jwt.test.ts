import { describe, expect, it } from 'vitest';
import {
  decodeBase64Url,
  decodeJwt,
  describeClaimTimes,
  encodeBase64Url,
  findSensitiveKeys,
  normalizeToken,
  type JwtDecoded,
} from './jwt';

const NOW = Date.UTC(2026, 9, 20, 12, 0, 0);
const NOW_S = NOW / 1000;

function makeToken(header: unknown, payload: unknown, signature = 'c2lnbmF0dXJl'): string {
  return [
    encodeBase64Url(JSON.stringify(header)),
    encodeBase64Url(JSON.stringify(payload)),
    signature,
  ].join('.');
}

function decodeOk(token: string, now = NOW): JwtDecoded {
  const result = decodeJwt(token, now);
  if (!result.ok) throw new Error(`unexpected error ${result.error.code}`);
  return result.jwt;
}

const header = { alg: 'HS256', typ: 'JWT' };

describe('normalizeToken', () => {
  it('strips Bearer, Authorization, quotes and whitespace', () => {
    expect(normalizeToken('  Bearer aaa.bbb.ccc \n')).toBe('aaa.bbb.ccc');
    expect(normalizeToken('Authorization: bearer aaa.\n bbb.\nccc')).toBe('aaa.bbb.ccc');
    expect(normalizeToken('"aaa.bbb.ccc"')).toBe('aaa.bbb.ccc');
  });
});

describe('base64url', () => {
  it('round-trips UTF-8 and rejects invalid characters', () => {
    const encoded = encodeBase64Url('{"name":"Ñandú ✓"}');
    expect(encoded).not.toMatch(/[+/=]/);
    expect(new TextDecoder().decode(decodeBase64Url(encoded) ?? new Uint8Array())).toBe(
      '{"name":"Ñandú ✓"}',
    );
    expect(decodeBase64Url('ab+c')).toBeNull();
    expect(decodeBase64Url('abcde')).toBeNull();
    expect(decodeBase64Url('')).toEqual(new Uint8Array());
  });
});

describe('decodeJwt', () => {
  it('decodes the canonical jwt.io example', () => {
    const jwt = decodeOk(
      'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    );
    expect(jwt.alg).toBe('HS256');
    expect(jwt.typ).toBe('JWT');
    expect(jwt.payloadJson).toBe(
      '{\n  "sub": "1234567890",\n  "name": "John Doe",\n  "iat": 1516239022\n}',
    );
    expect(jwt.parts.signature).toBe('SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
    expect(jwt.claims).toEqual({ iat: 1516239022 });
    expect(jwt.status).toBe('valid');
    expect(jwt.warnings).toEqual([{ code: 'missing-exp' }]);
  });

  it('computes expired, valid and not-yet-valid states with a fixed now', () => {
    expect(decodeOk(makeToken(header, { exp: NOW_S - 1 })).status).toBe('expired');
    expect(decodeOk(makeToken(header, { exp: NOW_S })).status).toBe('expired');
    expect(decodeOk(makeToken(header, { exp: NOW_S + 60 })).status).toBe('valid');
    expect(decodeOk(makeToken(header, { exp: NOW_S + 600, nbf: NOW_S + 60 })).status).toBe(
      'not-yet-valid',
    );
  });

  it('warns about alg none, missing alg and long lifetimes', () => {
    expect(decodeOk(makeToken({ alg: 'none' }, { exp: NOW_S + 60 }, '')).warnings).toEqual([
      { code: 'alg-none' },
    ]);
    expect(decodeOk(makeToken({ typ: 'JWT' }, { exp: NOW_S + 60 })).warnings).toEqual([
      { code: 'missing-alg' },
    ]);
    expect(decodeOk(makeToken(header, { iat: NOW_S, exp: NOW_S + 90 * 86_400 })).warnings).toEqual([
      { code: 'long-lifetime', days: 90 },
    ]);
    expect(decodeOk(makeToken(header, { exp: NOW_S + 31 * 86_400 })).warnings).toEqual([
      { code: 'long-lifetime', days: 31 },
    ]);
    expect(decodeOk(makeToken(header, { iat: NOW_S, exp: NOW_S + 30 * 86_400 })).warnings).toEqual(
      [],
    );
  });

  it('flags non-numeric time claims', () => {
    const jwt = decodeOk(makeToken(header, { exp: '2026-01-01', iat: NOW_S }));
    expect(jwt.claims).toEqual({ iat: NOW_S });
    expect(jwt.warnings).toEqual([{ code: 'invalid-claim', claim: 'exp' }]);
  });

  it('flags payload keys that look sensitive, including nested ones', () => {
    const jwt = decodeOk(
      makeToken(header, {
        exp: NOW_S + 60,
        user: { Password: 'x', cards: [{ card_number: '4111' }] },
        client_secret: 'y',
        company: 'ok',
      }),
    );
    expect(jwt.warnings).toEqual([
      { code: 'sensitive-keys', keys: ['Password', 'card_number', 'cards', 'client_secret'] },
    ]);
    expect(findSensitiveKeys({ spin: 1, company: 2, ssn: 3 })).toEqual(['ssn']);
  });

  it('reports structural errors as codes', () => {
    expect(decodeJwt('   ', NOW)).toEqual({ ok: false, error: { code: 'empty' } });
    expect(decodeJwt('a.b', NOW)).toEqual({ ok: false, error: { code: 'segments', count: 2 } });
    expect(decodeJwt('a.b.c.d.e', NOW)).toEqual({ ok: false, error: { code: 'jwe' } });
    expect(decodeJwt('a+b.c.d', NOW)).toEqual({
      ok: false,
      error: { code: 'base64', segment: 'header' },
    });
    const good = encodeBase64Url('{}');
    expect(decodeJwt(`${good}.${good}.a+b`, NOW)).toEqual({
      ok: false,
      error: { code: 'base64', segment: 'signature' },
    });
    expect(decodeJwt(`${good}.${encodeBase64Url('[1]')}.`, NOW)).toEqual({
      ok: false,
      error: { code: 'not-object', segment: 'payload' },
    });
    expect(decodeJwt(`${good}._w.`, NOW)).toEqual({
      ok: false,
      error: { code: 'utf8', segment: 'payload' },
    });
  });

  it('reports invalid JSON with the failing segment and position', () => {
    const result = decodeJwt(
      `${encodeBase64Url('{"alg":"HS256",}')}.${encodeBase64Url('{}')}.`,
      NOW,
    );
    expect(result.ok).toBe(false);
    if (result.ok || result.error.code !== 'json') throw new Error('expected a JSON error');
    expect(result.error.segment).toBe('header');
    expect(result.error.detail.code).toBe('trailing-comma');
    expect(result.error.detail.line).toBe(1);
  });
});

describe('describeClaimTimes', () => {
  it('formats claims in UTC, the chosen zone and relative to now', () => {
    const times = describeClaimTimes(
      { exp: NOW_S + 12 * 60, iat: NOW_S - 3 * 3600 },
      NOW,
      'America/Santiago',
    );
    expect(times).toEqual([
      {
        claim: 'exp',
        seconds: NOW_S + 720,
        utc: '2026-10-20T12:12:00.000Z',
        zoned: '2026-10-20T09:12:00-03:00',
        relative: 'in 12 minutes',
      },
      {
        claim: 'iat',
        seconds: NOW_S - 10_800,
        utc: '2026-10-20T09:00:00.000Z',
        zoned: '2026-10-20T06:00:00-03:00',
        relative: '3 hours ago',
      },
    ]);
  });

  it('localizes relative times', () => {
    const [exp] = describeClaimTimes({ exp: NOW_S - 3 * 3600 }, NOW, 'UTC', 'es');
    expect(exp?.relative).toBe('hace 3 horas');
    expect(exp?.zoned).toBe('2026-10-20T09:00:00Z');
  });
});
