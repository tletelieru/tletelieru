import { createPrivateKey, createPublicKey, generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { base64UrlToBytes } from './jose/encoding';
import { pemToJwk, jwkToPem } from './jose/pem';
import { publicJwk } from './jose/keys';
import { rfc7515A2Key, rfc7515A3Key, rfc7520EcKey } from './jose/rfc-vectors';
import { SAMPLE_PUBLIC_JWK } from './jose/samples';
import { convertKey, generateTestKey, testKeyKinds, type ConvertedKey } from './jwt-keys';
import { signJwt } from './jwt-sign';
import { verifyJwt } from './jwt-verify';

function converted(text: string): ConvertedKey {
  const result = convertKey(text);
  if (!result.ok) throw new Error(result.error);
  return result.key;
}

function nodeJwk(pem: string): object {
  const { kty, n, e, crv, x, y } = createPublicKey(pem).export({ format: 'jwk' });
  return Object.fromEntries(
    Object.entries({ kty, n, e, crv, x, y }).filter(([, value]) => value !== undefined),
  );
}

describe('PEM encoding', () => {
  it.each([
    ['RSA (RFC 7515 A.2)', rfc7515A2Key],
    ['P-256 (RFC 7515 A.3)', rfc7515A3Key],
    [
      'P-521 (RFC 7520)',
      { kty: 'EC', crv: 'P-521', x: rfc7520EcKey.x, y: rfc7520EcKey.y, d: rfc7520EcKey.d },
    ],
  ])('writes SPKI and PKCS#8 that OpenSSL reads for %s', (_, jwk) => {
    const publicPem = jwkToPem(jwk, 'public') ?? '';
    const privatePem = jwkToPem(jwk, 'private') ?? '';
    expect(publicPem).toMatch(/^-----BEGIN PUBLIC KEY-----\n/);
    expect(privatePem).toMatch(/^-----BEGIN PRIVATE KEY-----\n/);
    expect(nodeJwk(publicPem)).toMatchObject(publicJwk(jwk));
    const fromPrivate = createPrivateKey(privatePem).export({ format: 'jwk' });
    expect(fromPrivate).toMatchObject(publicJwk(jwk));
    expect(fromPrivate.d).toBe(jwk.d);
    expect(pemToJwk(privatePem)).toEqual({ ok: true, jwk });
    expect(pemToJwk(publicPem)).toEqual({ ok: true, jwk: publicJwk(jwk) });
  });

  it('reads PKCS#1 and SEC1 keys', () => {
    const rsa = createPrivateKey({ key: rfc7515A2Key, format: 'jwk' });
    expect(pemToJwk(rsa.export({ type: 'pkcs1', format: 'pem' }) as string)).toEqual({
      ok: true,
      jwk: rfc7515A2Key,
    });
    const rsaPublic = createPublicKey(rsa).export({ type: 'pkcs1', format: 'pem' }) as string;
    expect(pemToJwk(rsaPublic)).toEqual({ ok: true, jwk: publicJwk(rfc7515A2Key) });
    const ec = createPrivateKey({ key: rfc7515A3Key, format: 'jwk' });
    expect(pemToJwk(ec.export({ type: 'sec1', format: 'pem' }) as string)).toEqual({
      ok: true,
      jwk: rfc7515A3Key,
    });
  });

  it('skips an EC PARAMETERS block before the key', () => {
    const ec = createPrivateKey({ key: rfc7515A3Key, format: 'jwk' });
    const pem = ec.export({ type: 'sec1', format: 'pem' }) as string;
    const parameters =
      '-----BEGIN EC PARAMETERS-----\nBggqhkjOPQMBBw==\n-----END EC PARAMETERS-----\n';
    expect(pemToJwk(parameters + pem)).toEqual({ ok: true, jwk: rfc7515A3Key });
  });

  it('rejects encrypted, unknown and malformed PEM', () => {
    const encrypted = createPrivateKey({ key: rfc7515A3Key, format: 'jwk' }).export({
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: 'test',
    }) as string;
    expect(pemToJwk(encrypted)).toEqual({ ok: false, error: 'pem-encrypted' });
    expect(pemToJwk('-----BEGIN CERTIFICATE-----\nAA==\n-----END CERTIFICATE-----')).toEqual({
      ok: false,
      error: 'pem-unsupported',
    });
    expect(pemToJwk('-----BEGIN PUBLIC KEY-----\nAA==\n-----END PUBLIC KEY-----')).toEqual({
      ok: false,
      error: 'pem-malformed',
    });
    expect(pemToJwk('nothing')).toEqual({ ok: false, error: 'pem-malformed' });
  });

  it('reports key types it cannot represent', () => {
    const { publicKey } = generateKeyPairSync('ed25519');
    const pem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
    expect(pemToJwk(pem)).toEqual({ ok: false, error: 'key-unsupported' });
  });
});

describe('convertKey', () => {
  it('converts a public JWK to PEM and back', () => {
    const key = converted(SAMPLE_PUBLIC_JWK);
    expect(key).toMatchObject({ from: 'jwk', hasPrivate: false, publicPem: '', publicJwk: '' });
    expect(key.pem).toContain('BEGIN PUBLIC KEY');
    expect(JSON.parse(converted(key.pem).jwk)).toEqual(JSON.parse(SAMPLE_PUBLIC_JWK));
  });

  it('derives the public half of a private key', () => {
    const key = converted(JSON.stringify(rfc7515A2Key));
    expect(key.hasPrivate).toBe(true);
    expect(key.pem).toContain('BEGIN PRIVATE KEY');
    expect(key.publicPem).toContain('BEGIN PUBLIC KEY');
    expect(JSON.parse(key.publicJwk)).toEqual(publicJwk(rfc7515A2Key));
    expect(key.publicJwk).not.toContain('"d"');
  });

  it('handles a JWKS and skips symmetric keys in the PEM output', () => {
    const key = converted(
      JSON.stringify({ keys: [publicJwk(rfc7515A3Key), { kty: 'oct', k: 'AAAA' }] }),
    );
    expect(key.from).toBe('jwks');
    expect(key.pem.match(/BEGIN PUBLIC KEY/g)).toHaveLength(1);
    expect(JSON.parse(key.jwk).keys).toHaveLength(2);
  });

  it('gives oct keys no PEM form', () => {
    expect(converted('{"kty":"oct","k":"AAAA"}').pem).toBe('');
  });

  it('rejects private JWKs it cannot express as PKCS#8', () => {
    const { n, e, d } = rfc7515A2Key;
    expect(convertKey(JSON.stringify({ kty: 'RSA', n, e, d }))).toEqual({
      ok: false,
      error: 'key-unsupported',
    });
  });

  it('rejects plain text and unusable keys', () => {
    expect(convertKey('hello')).toEqual({ ok: false, error: 'key-not-jwk' });
    expect(convertKey('')).toEqual({ ok: false, error: 'key-empty' });
    expect(convertKey('{"kty":"EC","crv":"P-256","x":"AA","y":"AA"}')).toEqual({
      ok: false,
      error: 'key-invalid',
    });
    expect(convertKey('{"kty":"OKP","crv":"Ed25519","x":"AA"}')).toEqual({
      ok: false,
      error: 'key-unsupported',
    });
  });
});

describe('generateTestKey', () => {
  it('lists every requested kind', () => {
    expect(testKeyKinds).toEqual([
      'rsa-2048',
      'rsa-3072',
      'rsa-4096',
      'ec-p256',
      'ec-p384',
      'ec-p521',
      'hmac-256',
      'hmac-384',
      'hmac-512',
    ]);
  });

  it.each([
    ['ec-p256', 'ES256'],
    ['ec-p384', 'ES384'],
    ['ec-p521', 'ES512'],
    ['rsa-2048', 'PS256'],
  ] as const)('generates a working %s pair', async (kind, alg) => {
    const key = await generateTestKey(kind);
    expect(key.pem).toContain('BEGIN PRIVATE KEY');
    expect(JSON.parse(key.publicJwk)).not.toHaveProperty('d');
    const signed = await signJwt({
      header: '',
      payload: '{}',
      key: key.pem,
      encoding: 'text',
      alg,
      unsigned: false,
    });
    if (!signed.ok) throw new Error('sign failed');
    const verified = await verifyJwt({
      token: signed.token,
      key: key.publicPem,
      encoding: 'text',
      expectedAlg: alg,
    });
    expect(verified.status).toBe('valid');
  });

  it('generates HMAC secrets of the hash size', async () => {
    const key = await generateTestKey('hmac-512');
    const { k } = JSON.parse(key.jwk) as { k: string };
    expect(base64UrlToBytes(k)?.length).toBe(64);
    expect(key.secretHex).toHaveLength(128);
    expect(key.pem).toBe('');
    expect((await generateTestKey('hmac-256')).secretHex).not.toBe(key.secretHex);
  });
});
