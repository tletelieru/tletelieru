import { describe, expect, it } from 'vitest';
import { encodeBase64Url } from './jwt';
import { diffJwts } from './jwt-diff';

function token(header: object, payload: object, signature = 'c2ln'): string {
  return `${encodeBase64Url(JSON.stringify(header))}.${encodeBase64Url(JSON.stringify(payload))}.${signature}`;
}

function diffOf(left: string, right: string, mode: 'index' | 'set' = 'index') {
  const result = diffJwts(left, right, mode, 'America/Santiago');
  if (!result.ok) throw new Error(result.error.code);
  return result.diff;
}

describe('diffJwts', () => {
  it('reports no changes for the same token', () => {
    const same = token({ alg: 'HS256' }, { exp: 1 });
    expect(diffOf(same, same)).toEqual({
      header: [],
      payload: [],
      times: [],
      signatureChanged: false,
    });
  });

  it('compares header and payload with the JSON diff paths', () => {
    const diff = diffOf(
      token({ alg: 'HS256', typ: 'JWT' }, { sub: 'a', role: 'user' }),
      token({ alg: 'RS256', typ: 'JWT' }, { sub: 'a', admin: true }, 'b3RoZXI'),
    );
    expect(diff.header).toEqual([
      { op: 'changed', path: '$.alg', before: 'HS256', after: 'RS256' },
    ]);
    expect(diff.payload).toEqual([
      { op: 'removed', path: '$.role', value: 'user' },
      { op: 'added', path: '$.admin', value: true },
    ]);
    expect(diff.signatureChanged).toBe(true);
  });

  it('describes changed time claims with dates and the delta', () => {
    const diff = diffOf(
      token({ alg: 'HS256' }, { iat: 1_700_000_000, exp: 1_700_000_000 }),
      token({ alg: 'HS256' }, { iat: 1_700_000_000, exp: 1_700_003_600, nbf: 1_700_000_000 }),
    );
    expect(diff.times.map((time) => time.claim)).toEqual(['exp', 'nbf']);
    expect(diff.times[0]).toMatchObject({
      deltaSeconds: 3600,
      left: { utc: '2023-11-14T22:13:20.000Z', zoned: '2023-11-14T19:13:20-03:00' },
      right: { utc: '2023-11-14T23:13:20.000Z' },
    });
    expect(diff.times[1]).toMatchObject({ left: null, deltaSeconds: null });
  });

  it('honors the array mode', () => {
    const left = token({ alg: 'HS256' }, { aud: ['a', 'b'] });
    const right = token({ alg: 'HS256' }, { aud: ['b', 'a'] });
    expect(diffOf(left, right).payload.length).toBe(2);
    expect(diffOf(left, right, 'set').payload).toEqual([]);
  });

  it('reports which side failed', () => {
    const good = token({ alg: 'HS256' }, {});
    expect(diffJwts('x', good)).toEqual({
      ok: false,
      side: 'left',
      error: { code: 'segments', count: 1 },
    });
    expect(diffJwts(good, 'a.b.c.d.e')).toEqual({
      ok: false,
      side: 'right',
      error: { code: 'jwe' },
    });
  });
});
