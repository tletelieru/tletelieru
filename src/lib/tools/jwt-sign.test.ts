import { describe, expect, it } from 'vitest';
import { utf8 } from './hash';
import { jwsAlgs, type JwsAlg } from './jose/algorithms';
import { bytesToBase64Url } from './jose/encoding';
import { signJws } from './jose/jws';
import { jwkToPem } from './jose/pem';
import { publicJwk } from './jose/keys';
import {
  rfc7515A1Key,
  rfc7515A1Token,
  rfc7515A2Key,
  rfc7515A2Token,
  rfc7515A3Key,
  rfc7520EcKey,
} from './jose/rfc-vectors';
import { SAMPLE_JWT, SAMPLE_PAYLOAD, SAMPLE_SECRET } from './jose/samples';
import { applyTimeClaims, signJwt, type SignInput, type SignResult } from './jwt-sign';
import { verifyJwt } from './jwt-verify';

const PAYLOAD = '{"sub":"user-1"}';

function sign(alg: JwsAlg, key: unknown, extra: Partial<SignInput> = {}) {
  return signJwt({
    header: '',
    payload: PAYLOAD,
    key: typeof key === 'string' ? key : JSON.stringify(key),
    encoding: 'text',
    alg,
    unsigned: false,
    ...extra,
  });
}

function tokenOf(result: SignResult): string {
  if (!result.ok) throw new Error(`unexpected ${JSON.stringify(result.error)}`);
  return result.token;
}

const hsKey = { kty: 'oct', k: bytesToBase64Url(new Uint8Array(64).fill(7)) };
const p384 = {
  kty: 'EC',
  crv: 'P-384',
  x: 'rAP6i2nz7DN_ZxRfnvtSDvb_IwDs4Qq9YSiVT5rs0XBU3Cnwa6N3kFcGqxPbz8ET',
  y: 'yb5BqTnBNyOvqLNT_iq2XNIPNiwuQz5dlV3t5jVVtSCuQwXeCeWJeNVwUwUv3lJF',
};

describe('published vectors', () => {
  it('reproduces the RFC 7515 A.1 and A.2 signatures byte for byte', async () => {
    const [header, payload, signature] = rfc7515A1Token.split('.');
    const mac = await signJws('HS256', rfc7515A1Key, utf8(`${header}.${payload}`));
    expect(bytesToBase64Url(mac)).toBe(signature);
    const [h2, p2, s2] = rfc7515A2Token.split('.');
    const rsa = await signJws('RS256', rfc7515A2Key, utf8(`${h2}.${p2}`));
    expect(bytesToBase64Url(rsa)).toBe(s2);
  });

  it('reproduces the well-known jwt.io token', async () => {
    const result = await sign('HS256', SAMPLE_SECRET, { payload: SAMPLE_PAYLOAD });
    expect(tokenOf(result)).toBe(SAMPLE_JWT);
  });
});

describe('signJwt', () => {
  it('round-trips through the verifier for the algorithms with a usable test key', async () => {
    const keys: Partial<Record<JwsAlg, unknown>> = {
      HS256: hsKey,
      HS384: hsKey,
      HS512: hsKey,
      RS256: rfc7515A2Key,
      RS384: rfc7515A2Key,
      RS512: rfc7515A2Key,
      PS256: rfc7515A2Key,
      PS384: rfc7515A2Key,
      PS512: rfc7515A2Key,
      ES256: rfc7515A3Key,
      ES512: rfc7520EcKey,
    };
    for (const alg of jwsAlgs) {
      const key = keys[alg];
      if (key === undefined) continue;
      const token = tokenOf(await sign(alg, key));
      const verified = await verifyJwt({
        token,
        key: JSON.stringify(key),
        encoding: 'text',
        expectedAlg: alg,
      });
      expect(verified.status, alg).toBe('valid');
    }
  });

  it('signs with a PEM private key', async () => {
    const pem = jwkToPem(rfc7515A2Key, 'private') ?? '';
    const token = tokenOf(await sign('RS256', pem));
    const verified = await verifyJwt({
      token,
      key: JSON.stringify(publicJwk(rfc7515A2Key)),
      encoding: 'text',
      expectedAlg: 'RS256',
    });
    expect(verified.status).toBe('valid');
  });

  it('never signs with a public key or a mismatched key', async () => {
    expect(await sign('RS256', publicJwk(rfc7515A2Key))).toEqual({
      ok: false,
      error: { code: 'key', failure: 'key-public' },
    });
    expect(await sign('RS256', 'a-secret')).toEqual({
      ok: false,
      error: { code: 'key', failure: 'key-type' },
    });
    expect(await sign('HS256', rfc7515A2Key)).toEqual({
      ok: false,
      error: { code: 'key', failure: 'key-type' },
    });
    expect(await sign('ES384', rfc7515A3Key)).toEqual({
      ok: false,
      error: { code: 'key', failure: 'key-curve' },
    });
    expect(await sign('ES384', p384)).toEqual({
      ok: false,
      error: { code: 'key', failure: 'key-public' },
    });
  });

  it('warns about short secrets and an overridden header alg', async () => {
    const result = await sign('HS256', 'short', { header: '{"alg":"RS256","typ":"JWT"}' });
    expect(result).toMatchObject({
      ok: true,
      warnings: [
        { code: 'alg-overridden', from: 'RS256' },
        { code: 'weak-secret', bytes: 5, minimum: 32 },
      ],
    });
  });

  it('produces alg none only with the explicit unsigned flag', async () => {
    const unsigned = await sign('HS256', '', { unsigned: true });
    expect(unsigned).toMatchObject({ ok: true, warnings: [{ code: 'unsigned' }] });
    expect(tokenOf(unsigned).endsWith('.')).toBe(true);
    expect(JSON.parse(atob(tokenOf(unsigned).split('.')[0] ?? ''))).toEqual({
      alg: 'none',
      typ: 'JWT',
    });
    expect(await sign('HS256', '')).toEqual({
      ok: false,
      error: { code: 'key', failure: 'key-empty' },
    });
    const noneHeader = await sign('HS256', 'secret', { header: '{"alg":"none"}' });
    expect(atob(tokenOf(noneHeader).split('.')[0] ?? '')).toContain('HS256');
  });

  it('reports invalid JSON by side', async () => {
    expect(await sign('HS256', 'k', { payload: '{' })).toMatchObject({
      ok: false,
      error: { code: 'json', side: 'payload' },
    });
    expect(await sign('HS256', 'k', { header: '[]' })).toEqual({
      ok: false,
      error: { code: 'not-object', side: 'header' },
    });
  });
});

describe('applyTimeClaims', () => {
  it('sets claims and keeps the rest of the payload', () => {
    expect(applyTimeClaims('{"sub":"a","iat":1}', { iat: 5, exp: 65 })).toBe(
      '{\n  "sub": "a",\n  "iat": 5,\n  "exp": 65\n}',
    );
    expect(applyTimeClaims('', { iat: 5 })).toBe('{\n  "iat": 5\n}');
  });

  it('refuses text that is not a JSON object', () => {
    expect(applyTimeClaims('{', { iat: 5 })).toBeNull();
    expect(applyTimeClaims('[1]', { iat: 5 })).toBeNull();
  });
});
