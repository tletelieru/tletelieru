import { describe, expect, it } from 'vitest';
import { hmac, utf8 } from './hash';
import { base64UrlToBytes, bytesToBase64Url, concatBytes } from './jose/encoding';
import { verifyJws } from './jose/jws';
import { publicJwk } from './jose/keys';
import { jwkToPem } from './jose/pem';
import {
  rfc7515A1Key,
  rfc7515A1Token,
  rfc7515A2Key,
  rfc7515A2Token,
  rfc7515A3Key,
  rfc7515A3Token,
  rfc7515A4Key,
  rfc7515A4Token,
  rfc7515A5Token,
  rfc7520EcKey,
  rfc7520Es512,
  rfc7520Hs256,
  rfc7520NestedJws,
  rfc7520NestedSigKey,
  rfc7520OctKey,
  rfc7520Ps384,
  rfc7520Rs256,
  rfc7520RsaKey,
} from './jose/rfc-vectors';
import { encodeBase64Url } from './jwt';
import { verifyJwt, type VerifyInput, type VerifyResult } from './jwt-verify';

function verify(token: string, key: unknown, extra: Partial<VerifyInput> = {}) {
  return verifyJwt({
    token,
    key: typeof key === 'string' ? key : JSON.stringify(key),
    encoding: 'text',
    expectedAlg: 'auto',
    ...extra,
  });
}

function reason(result: VerifyResult): string {
  return result.status === 'invalid' ? result.reason : `not invalid: ${result.status}`;
}

async function hsToken(header: object, payload: object, secret: string): Promise<string> {
  const input = `${encodeBase64Url(JSON.stringify(header))}.${encodeBase64Url(JSON.stringify(payload))}`;
  const mac = await hmac('sha256', utf8(secret), utf8(input));
  return `${input}.${bytesToBase64Url(mac)}`;
}

function tamperPayload(token: string): string {
  const [header, , signature] = token.split('.');
  return `${header}.${encodeBase64Url('{"admin":true}')}.${signature}`;
}

function replaceAlg(token: string, alg: string): string {
  const [, payload, signature] = token.split('.');
  return `${encodeBase64Url(JSON.stringify({ alg }))}.${payload}.${signature}`;
}

function toDer(raw: Uint8Array): string {
  const half = raw.length / 2;
  const integer = (bytes: Uint8Array) => {
    const body = (bytes[0] ?? 0) >= 0x80 ? concatBytes(Uint8Array.of(0), bytes) : bytes;
    return concatBytes(Uint8Array.of(2, body.length), body);
  };
  const body = concatBytes(integer(raw.subarray(0, half)), integer(raw.subarray(half)));
  return bytesToBase64Url(concatBytes(Uint8Array.of(0x30, body.length), body));
}

describe('published vectors', () => {
  it('verifies RFC 7515 A.1 (HS256)', async () => {
    expect(await verify(rfc7515A1Token, rfc7515A1Key)).toMatchObject({
      status: 'valid',
      alg: 'HS256',
      source: 'jwk',
      warnings: [],
    });
  });

  it('verifies RFC 7515 A.2 (RS256) with a JWK and with its PEM', async () => {
    expect((await verify(rfc7515A2Token, publicJwk(rfc7515A2Key))).status).toBe('valid');
    const pem = jwkToPem(rfc7515A2Key, 'public') ?? '';
    expect(await verify(rfc7515A2Token, pem)).toMatchObject({ status: 'valid', source: 'pem' });
  });

  it('verifies RFC 7515 A.3 (ES256 with a raw r||s signature)', async () => {
    expect((await verify(rfc7515A3Token, publicJwk(rfc7515A3Key))).status).toBe('valid');
  });

  it('verifies RFC 7515 A.4 (ES512) through the low-level primitive', async () => {
    const [header = '', payload = '', signature = ''] = rfc7515A4Token.split('.');
    const bytes = base64UrlToBytes(signature);
    expect(bytes?.length).toBe(132);
    if (!bytes) throw new Error('bad signature');
    expect(await verifyJws('ES512', rfc7515A4Key, utf8(`${header}.${payload}`), bytes)).toBe(true);
  });

  it.each([
    ['RS256', rfc7520Rs256, rfc7520RsaKey],
    ['PS384', rfc7520Ps384, rfc7520RsaKey],
    ['ES512', rfc7520Es512, rfc7520EcKey],
    ['HS256', rfc7520Hs256, rfc7520OctKey],
  ] as const)('verifies the RFC 7520 cookbook %s example', async (alg, token, key) => {
    const [header = '', payload = '', signature = ''] = token.split('.');
    const bytes = base64UrlToBytes(signature);
    if (!bytes) throw new Error('bad signature');
    expect(await verifyJws(alg, key, utf8(`${header}.${payload}`), bytes)).toBe(true);
  });

  it('verifies the RFC 7520 section 6 PS256 JWT and warns when given a private key', async () => {
    expect(await verify(rfc7520NestedJws, rfc7520NestedSigKey)).toMatchObject({
      status: 'valid',
      alg: 'PS256',
      warnings: [{ code: 'private-key' }],
    });
  });

  it('never verifies the RFC 7515 A.5 unsecured token', async () => {
    expect(reason(await verify(rfc7515A5Token, rfc7515A1Key))).toBe('alg-none');
  });
});

describe('fails closed', () => {
  it('rejects tampered payloads and signatures', async () => {
    expect(reason(await verify(tamperPayload(rfc7515A1Token), rfc7515A1Key))).toBe('signature');
    expect(reason(await verify(tamperPayload(rfc7515A2Token), publicJwk(rfc7515A2Key)))).toBe(
      'signature',
    );
    expect(reason(await verify(tamperPayload(rfc7515A3Token), publicJwk(rfc7515A3Key)))).toBe(
      'signature',
    );
    const flipped = rfc7515A1Token.slice(0, -5) + (rfc7515A1Token.at(-5) === 'A' ? 'B' : 'A');
    expect(reason(await verify(`${flipped}${rfc7515A1Token.slice(-4)}`, rfc7515A1Key))).toBe(
      'signature',
    );
  });

  it('rejects the wrong key', async () => {
    expect(reason(await verify(rfc7515A1Token, 'wrong-secret'))).toBe('signature');
    expect(reason(await verify(rfc7515A2Token, publicJwk(rfc7520RsaKey)))).toBe('signature');
  });

  it('blocks RS256 to HS256 confusion with the public key as HMAC secret', async () => {
    const pem = jwkToPem(rfc7515A2Key, 'public') ?? '';
    const forged = await hsToken({ alg: 'HS256' }, { admin: true }, pem);
    expect(reason(await verify(forged, pem))).toBe('key-type');
    expect(reason(await verify(forged, publicJwk(rfc7515A2Key)))).toBe('key-type');
    expect(reason(await verify(forged, { keys: [publicJwk(rfc7515A2Key)] }))).toBe('key-type');
  });

  it('treats a PEM with surrounding text as a key, never as an HMAC secret', async () => {
    const pem = `Public key:\n${jwkToPem(rfc7515A2Key, 'public') ?? ''}\n`;
    const forged = await hsToken({ alg: 'HS256' }, { admin: true }, pem);
    expect((await verify(forged, pem)).status).toBe('invalid');
    expect(reason(await verify(forged, pem))).toBe('key-type');
    expect(reason(await verify(forged, 'prefix -----BEGIN broken'))).toBe('pem-malformed');
  });

  it('rejects a shared secret for asymmetric algorithms', async () => {
    expect(reason(await verify(rfc7515A2Token, 'a-secret'))).toBe('key-type');
    expect(reason(await verify(rfc7515A3Token, rfc7515A1Key))).toBe('key-type');
  });

  it('rejects an RSA key on an ES token and the wrong curve', async () => {
    expect(reason(await verify(rfc7515A3Token, publicJwk(rfc7515A2Key)))).toBe('key-type');
    expect(reason(await verify(rfc7515A3Token, publicJwk(rfc7520EcKey)))).toBe('key-curve');
  });

  it('honors the pinned algorithm', async () => {
    expect(reason(await verify(rfc7515A1Token, rfc7515A1Key, { expectedAlg: 'RS256' }))).toBe(
      'alg-mismatch',
    );
    expect((await verify(rfc7515A1Token, rfc7515A1Key, { expectedAlg: 'HS256' })).status).toBe(
      'valid',
    );
  });

  it('rejects a header swapped from RS256 to PS256 with the same signature', async () => {
    const swapped = replaceAlg(rfc7515A2Token, 'PS256');
    expect(reason(await verify(swapped, publicJwk(rfc7515A2Key)))).toBe('signature');
  });

  it.each(['none', 'None', 'NONE', 'nOnE'])('never accepts alg %s', async (alg) => {
    const token = `${encodeBase64Url(JSON.stringify({ alg }))}.${encodeBase64Url('{}')}.`;
    expect(reason(await verify(token, rfc7515A1Key))).toBe('alg-none');
  });

  it('rejects a missing or unknown alg', async () => {
    const missing = `${encodeBase64Url('{"typ":"JWT"}')}.${encodeBase64Url('{}')}.`;
    expect(reason(await verify(missing, rfc7515A1Key))).toBe('alg-missing');
    const unknown = `${encodeBase64Url('{"alg":"EdDSA"}')}.${encodeBase64Url('{}')}.`;
    expect(reason(await verify(unknown, rfc7515A1Key))).toBe('alg-unsupported');
  });

  it('rejects unknown critical headers', async () => {
    const token = await hsToken({ alg: 'HS256', crit: ['exp'], exp: 1 }, {}, 'secret');
    expect(reason(await verify(token, 'secret'))).toBe('crit');
  });

  it('rejects JWK alg, use and key_ops that do not allow the operation', async () => {
    expect(reason(await verify(rfc7515A1Token, { ...rfc7515A1Key, alg: 'HS512' }))).toBe('key-alg');
    expect(reason(await verify(rfc7515A1Token, { ...rfc7515A1Key, use: 'enc' }))).toBe('key-use');
    expect(reason(await verify(rfc7515A1Token, { ...rfc7515A1Key, key_ops: ['sign'] }))).toBe(
      'key-use',
    );
  });

  it('rejects empty and wrong-length signatures', async () => {
    const [header, payload] = rfc7515A1Token.split('.');
    expect(reason(await verify(`${header}.${payload}.`, rfc7515A1Key))).toBe('signature-length');
    expect(reason(await verify(`${rfc7515A3Token}AAAA`, publicJwk(rfc7515A3Key)))).toBe(
      'signature-length',
    );
  });

  it('rejects non-canonical base64url signatures', async () => {
    expect(reason(await verify(`${rfc7515A1Token}=`, rfc7515A1Key))).toBe('signature-encoding');
  });

  it('reports DER-encoded ECDSA signatures instead of accepting them', async () => {
    const [header, payload, signature = ''] = rfc7515A3Token.split('.');
    const raw = base64UrlToBytes(signature);
    if (!raw) throw new Error('bad signature');
    const der = `${header}.${payload}.${toDer(raw)}`;
    expect(reason(await verify(der, publicJwk(rfc7515A3Key)))).toBe('signature-der');
  });

  it('rejects RSA keys below 2048 bits', async () => {
    const short = { kty: 'RSA', n: bytesToBase64Url(new Uint8Array(128).fill(0xc3)), e: 'AQAB' };
    expect(reason(await verify(rfc7515A2Token, short))).toBe('key-size');
  });

  it('rejects unusable key material', async () => {
    expect(reason(await verify(rfc7515A1Token, ''))).toBe('key-empty');
    expect(reason(await verify(rfc7515A1Token, '{oops'))).toBe('key-json');
    expect(reason(await verify(rfc7515A1Token, '{"foo":1}'))).toBe('key-not-jwk');
    expect(reason(await verify(rfc7515A1Token, '{"keys":[]}'))).toBe('key-jwks-empty');
    expect(reason(await verify(rfc7515A1Token, '-----BEGIN NOPE-----'))).toBe('pem-malformed');
    expect(reason(await verify(rfc7515A1Token, 'zz', { encoding: 'hex' }))).toBe('key-encoding');
  });

  it('reports malformed tokens separately', async () => {
    expect(await verify('a.b', 'secret')).toEqual({
      status: 'malformed',
      error: { code: 'segments', count: 2 },
    });
    expect((await verify('a.b.c.d.e', 'secret')).status).toBe('malformed');
  });
});

describe('secrets and JWKS selection', () => {
  it('decodes hex and base64 secrets', async () => {
    const token = await hsToken({ alg: 'HS256' }, {}, 'secret-value-with-32-bytes-long!');
    const hex = Buffer.from('secret-value-with-32-bytes-long!').toString('hex');
    const base64 = Buffer.from('secret-value-with-32-bytes-long!').toString('base64');
    expect((await verify(token, hex, { encoding: 'hex' })).status).toBe('valid');
    expect((await verify(token, base64, { encoding: 'base64' })).status).toBe('valid');
  });

  it('warns about short HMAC secrets but still verifies them', async () => {
    const token = await hsToken({ alg: 'HS256' }, {}, 'short');
    expect(await verify(token, 'short')).toMatchObject({
      status: 'valid',
      source: 'secret',
      warnings: [{ code: 'weak-secret', bytes: 5, minimum: 32 }],
    });
  });

  const jwks = {
    keys: [
      { ...publicJwk(rfc7515A3Key), kid: 'ec-1' },
      { ...publicJwk(rfc7515A2Key), kid: 'rsa-1' },
      { kty: 'OKP', crv: 'Ed25519', x: 'AA', kid: 'ed-1' },
    ],
  };

  function withKid(token: string, kid: string): string {
    const [header = '', payload, signature] = token.split('.');
    const decoded = JSON.parse(Buffer.from(header, 'base64url').toString()) as object;
    return `${encodeBase64Url(JSON.stringify({ ...decoded, kid }))}.${payload}.${signature}`;
  }

  it('selects by alg family when the token has no kid', async () => {
    expect(await verify(rfc7515A2Token, jwks)).toMatchObject({ status: 'valid', source: 'jwks' });
    expect((await verify(rfc7515A3Token, jwks)).status).toBe('valid');
  });

  it('selects by kid and fails when the kid is unknown', async () => {
    const signed = await hsToken({ alg: 'HS256', kid: 'other' }, {}, 'secret');
    expect(reason(await verify(signed, jwks))).toBe('kid-not-found');
    expect(reason(await verify(withKid(rfc7515A2Token, 'ec-1'), jwks))).toBe('key-type');
    expect(reason(await verify(withKid(rfc7515A2Token, 'ed-1'), jwks))).toBe('key-unsupported');
  });

  it('refuses ambiguous selections', async () => {
    const twins = { keys: [publicJwk(rfc7515A2Key), publicJwk(rfc7520RsaKey)] };
    expect(reason(await verify(rfc7515A2Token, twins))).toBe('kid-ambiguous');
    const dup = {
      keys: [
        { ...publicJwk(rfc7515A2Key), kid: 'same' },
        { ...publicJwk(rfc7520RsaKey), kid: 'same', use: undefined },
      ],
    };
    expect(reason(await verify(withKid(rfc7515A2Token, 'same'), dup))).toBe('kid-ambiguous');
  });
});
