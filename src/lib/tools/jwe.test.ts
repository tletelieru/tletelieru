import { describe, expect, it } from 'vitest';
import { utf8, type Bytes } from './hash';
import { bytesToBase64Url } from './jose/encoding';
import { bareJwk } from './jose/jws';
import { publicJwk, type Jwk } from './jose/keys';
import {
  rfc7516A1Key,
  rfc7516A1Token,
  rfc7516A3Token,
  rfc7520A128Kw,
  rfc7520Dir,
  rfc7520DirKey,
  rfc7520KwKey,
  rfc7520NestedJwe,
  rfc7520NestedJws,
  rfc7520Rsa4096Key,
  rfc7520RsaOaep,
} from './jose/rfc-vectors';
import { SAMPLE_JWE, SAMPLE_JWE_KEY } from './jose/samples';
import { decryptJwe, inspectJwe, type JweDecryptResult, type JweInspection } from './jwe';
import { encodeBase64Url } from './jwt';

function inspected(token: string): JweInspection {
  const result = inspectJwe(token);
  if (!result.ok) throw new Error(result.error.code);
  return result.jwe;
}

function decrypt(token: string, key: unknown, encoding: 'text' | 'hex' | 'base64' = 'text') {
  const text = typeof key === 'string' ? key : JSON.stringify(key);
  return decryptJwe(inspected(token), text, encoding);
}

function failure(result: JweDecryptResult): string {
  return result.ok ? 'decrypted' : result.failure;
}

function plaintext(result: JweDecryptResult): string {
  if (!result.ok) throw new Error(result.failure);
  return result.text;
}

const cookbook = 'You can trust us to stick with you through thick and thin';

async function seal(
  header: object,
  cek: Bytes,
  encryptedKey: Uint8Array,
  message: string,
  iv: Bytes = crypto.getRandomValues(new Uint8Array(12)),
): Promise<string> {
  const protectedHeader = encodeBase64Url(JSON.stringify(header));
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: utf8(protectedHeader), tagLength: 128 },
      key,
      utf8(message),
    ),
  );
  const ciphertext = sealed.subarray(0, -16);
  const tag = sealed.subarray(-16);
  return [
    protectedHeader,
    bytesToBase64Url(encryptedKey),
    bytesToBase64Url(iv),
    bytesToBase64Url(ciphertext),
    bytesToBase64Url(tag),
  ].join('.');
}

async function wrapKw(kek: Bytes, cek: Bytes): Promise<Uint8Array> {
  const wrapping = await crypto.subtle.importKey('raw', kek, 'AES-KW', false, ['wrapKey']);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', true, ['encrypt']);
  return new Uint8Array(await crypto.subtle.wrapKey('raw', key, wrapping, 'AES-KW'));
}

async function wrapOaep(jwk: Jwk, hash: string, cek: Bytes): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'jwk',
    bareJwk(jwk, 'public'),
    { name: 'RSA-OAEP', hash },
    false,
    ['encrypt'],
  );
  return new Uint8Array(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, cek));
}

function randomBytes(size: number): Bytes {
  return crypto.getRandomValues(new Uint8Array(size));
}

const rsaNoAlg: Jwk = { ...rfc7520Rsa4096Key, alg: undefined };

describe('inspectJwe', () => {
  it('reads the header and part sizes of the RFC 7516 A.1 token', () => {
    const jwe = inspected(rfc7516A1Token);
    expect(jwe.alg).toBe('RSA-OAEP');
    expect(jwe.enc).toBe('A256GCM');
    expect(jwe.bytes.encryptedKey.length).toBe(256);
    expect(jwe.bytes.iv.length).toBe(12);
    expect(jwe.bytes.tag.length).toBe(16);
    expect(jwe.bytes.ciphertext.length).toBe(63);
    expect(jwe.support).toEqual({ supported: true, alg: 'RSA-OAEP', enc: 'A256GCM' });
    expect(jwe.nestedHint).toBe(false);
  });

  it('detects nested JWTs from cty', () => {
    expect(inspected(rfc7520NestedJwe).nestedHint).toBe(true);
    expect(inspected(`Bearer ${rfc7520Dir}`).kid).toBe('77c7e2b8-6e13-45cf-8672-617b5b45243a');
  });

  it('reports structural problems', () => {
    expect(inspectJwe('')).toEqual({ ok: false, error: { code: 'empty' } });
    expect(inspectJwe('a.b.c')).toEqual({ ok: false, error: { code: 'jws' } });
    expect(inspectJwe('a.b')).toEqual({ ok: false, error: { code: 'segments', count: 2 } });
    expect(inspectJwe('a+.b.c.d.e')).toEqual({
      ok: false,
      error: { code: 'base64', part: 'protected' },
    });
    expect(inspectJwe('_w....')).toEqual({ ok: false, error: { code: 'utf8' } });
    expect(inspectJwe(`${encodeBase64Url('[1]')}....`)).toEqual({
      ok: false,
      error: { code: 'not-object' },
    });
    expect(inspectJwe(`${encodeBase64Url('{"alg":')}....`)).toMatchObject({
      ok: false,
      error: { code: 'json' },
    });
    expect(inspectJwe(`${encodeBase64Url('{}')}....`)).toEqual({
      ok: false,
      error: { code: 'missing-alg' },
    });
    expect(inspectJwe(`${encodeBase64Url('{"alg":"dir"}')}....`)).toEqual({
      ok: false,
      error: { code: 'missing-enc' },
    });
  });

  it.each([
    [{ alg: 'A128KW', enc: 'A128CBC-HS256' }, 'enc', 'A128CBC-HS256'],
    [{ alg: 'RSA1_5', enc: 'A128GCM' }, 'alg', 'RSA1_5'],
    [{ alg: 'ECDH-ES', enc: 'A128GCM' }, 'alg', 'ECDH-ES'],
    [{ alg: 'A192KW', enc: 'A128GCM' }, 'alg', 'A192KW'],
    [{ alg: 'dir', enc: 'A192GCM' }, 'enc', 'A192GCM'],
    [{ alg: 'dir', enc: 'A128GCM', zip: 'DEF' }, 'zip', 'DEF'],
    [{ alg: 'dir', enc: 'A128GCM', crit: ['x'] }, 'crit', '["x"]'],
  ])('flags %j as unsupported', (header, field, value) => {
    const token = `${encodeBase64Url(JSON.stringify(header))}....`;
    expect(inspected(token).support).toEqual({ supported: false, field, value });
  });

  it('reports the RFC 7516 A.3 CBC-HS token as unsupported', async () => {
    expect(inspected(rfc7516A3Token).support).toMatchObject({
      supported: false,
      field: 'enc',
      value: 'A128CBC-HS256',
    });
    expect(failure(await decrypt(rfc7516A3Token, 'GawgguFyGrWKav7AX4VKUg', 'base64'))).toBe(
      'unsupported',
    );
  });
});

describe('published decryption vectors', () => {
  it('decrypts RFC 7516 A.1 (RSA-OAEP + A256GCM)', async () => {
    expect(plaintext(await decrypt(rfc7516A1Token, rfc7516A1Key))).toBe(
      'The true sign of intelligence is not knowledge but imagination.',
    );
  });

  it('decrypts RFC 7520 5.2 (RSA-OAEP + A256GCM)', async () => {
    expect(plaintext(await decrypt(rfc7520RsaOaep, rfc7520Rsa4096Key))).toContain(cookbook);
  });

  it('decrypts RFC 7520 5.6 (dir + A128GCM) and the shipped sample', async () => {
    expect(plaintext(await decrypt(rfc7520Dir, rfc7520DirKey))).toContain(cookbook);
    expect(plaintext(await decrypt(SAMPLE_JWE, SAMPLE_JWE_KEY))).toContain(cookbook);
  });

  it('decrypts RFC 7520 5.8 (A128KW + A128GCM)', async () => {
    expect(plaintext(await decrypt(rfc7520A128Kw, rfc7520KwKey))).toContain(cookbook);
  });

  it('detects the nested JWT of RFC 7520 section 6', async () => {
    const result = await decrypt(rfc7520NestedJwe, rfc7520Rsa4096Key);
    expect(plaintext(result)).toBe(rfc7520NestedJws);
    expect(result).toMatchObject({ ok: true, nested: { alg: 'PS256', typ: 'JWT' } });
  });
});

describe('round trips for the remaining combinations', () => {
  it('decrypts dir + A256GCM with raw secrets', async () => {
    const cek = randomBytes(32);
    const token = await seal({ alg: 'dir', enc: 'A256GCM' }, cek, new Uint8Array(), 'hola');
    const hex = Buffer.from(cek).toString('hex');
    expect(plaintext(await decrypt(token, hex, 'hex'))).toBe('hola');
    const base64 = Buffer.from(cek).toString('base64');
    expect(plaintext(await decrypt(token, base64, 'base64'))).toBe('hola');
  });

  it.each([
    ['A128KW', 16, 'A128GCM', 16],
    ['A128KW', 16, 'A256GCM', 32],
    ['A256KW', 32, 'A128GCM', 16],
    ['A256KW', 32, 'A256GCM', 32],
  ])('decrypts %s + %s', async (alg, kekSize, enc, cekSize) => {
    const kek = randomBytes(kekSize);
    const cek = randomBytes(cekSize);
    const token = await seal({ alg, enc }, cek, await wrapKw(kek, cek), 'hola');
    const jwk = { kty: 'oct', k: bytesToBase64Url(kek) };
    expect(plaintext(await decrypt(token, jwk))).toBe('hola');
  });

  it.each([
    ['RSA-OAEP', 'SHA-1', 'A128GCM', 16],
    ['RSA-OAEP-256', 'SHA-256', 'A128GCM', 16],
    ['RSA-OAEP-256', 'SHA-256', 'A256GCM', 32],
  ])('decrypts %s + %s', async (alg, hash, enc, cekSize) => {
    const cek = randomBytes(cekSize);
    const token = await seal({ alg, enc }, cek, await wrapOaep(rsaNoAlg, hash, cek), 'hola');
    expect(plaintext(await decrypt(token, rsaNoAlg))).toBe('hola');
  });

  it('returns binary plaintext as base64', async () => {
    const cek = randomBytes(16);
    const iv = randomBytes(12);
    const header = encodeBase64Url('{"alg":"dir","enc":"A128GCM"}');
    const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
    const sealed = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv, additionalData: utf8(header) },
        key,
        Uint8Array.of(0xff, 0xfe),
      ),
    );
    const token = [
      header,
      '',
      bytesToBase64Url(iv),
      bytesToBase64Url(sealed.subarray(0, -16)),
      bytesToBase64Url(sealed.subarray(-16)),
    ].join('.');
    expect(await decrypt(token, { kty: 'oct', k: bytesToBase64Url(cek) })).toEqual({
      ok: true,
      text: '//4=',
      binary: true,
      nested: null,
    });
  });
});

describe('fails closed', () => {
  function replacePart(token: string, index: number, value: string): string {
    const parts = token.split('.');
    parts[index] = value;
    return parts.join('.');
  }

  it('rejects tampered ciphertext, tag, header and wrong keys', async () => {
    const parts = rfc7520Dir.split('.');
    const ciphertext = parts[3] ?? '';
    const flipped = `${ciphertext.at(0) === 'A' ? 'B' : 'A'}${ciphertext.slice(1)}`;
    expect(failure(await decrypt(replacePart(rfc7520Dir, 3, flipped), rfc7520DirKey))).toBe(
      'decrypt',
    );
    const tag = parts[4] ?? '';
    const badTag = `${tag.at(0) === 'A' ? 'B' : 'A'}${tag.slice(1)}`;
    expect(failure(await decrypt(replacePart(rfc7520Dir, 4, badTag), rfc7520DirKey))).toBe(
      'decrypt',
    );
    const header = encodeBase64Url('{"alg":"dir","enc":"A128GCM"}');
    const noKid = replacePart(rfc7520Dir, 0, header);
    expect(failure(await decrypt(noKid, { ...rfc7520DirKey, kid: undefined }))).toBe('decrypt');
    const wrong = { kty: 'oct', k: bytesToBase64Url(new Uint8Array(16)) };
    expect(failure(await decrypt(rfc7520Dir, wrong))).toBe('decrypt');
    expect(failure(await decrypt(rfc7520A128Kw, wrong))).toBe('decrypt');
  });

  it('rejects invalid sizes', async () => {
    const short = { kty: 'oct', k: 'AAAA' };
    expect(failure(await decrypt(rfc7520Dir, short))).toBe('cek-size');
    expect(failure(await decrypt(rfc7520A128Kw, short))).toBe('cek-size');
    expect(failure(await decrypt(replacePart(rfc7520Dir, 2, 'AAAA'), rfc7520DirKey))).toBe(
      'iv-size',
    );
    expect(failure(await decrypt(replacePart(rfc7520Dir, 4, 'AAAA'), rfc7520DirKey))).toBe(
      'tag-size',
    );
    expect(failure(await decrypt(replacePart(rfc7520Dir, 1, 'AAAA'), rfc7520DirKey))).toBe(
      'encrypted-key-present',
    );
  });

  it('rejects keys that do not fit the algorithm', async () => {
    expect(failure(await decrypt(rfc7516A1Token, 'a-secret'))).toBe('key-type');
    expect(failure(await decrypt(rfc7516A1Token, publicJwk(rfc7516A1Key)))).toBe('key-public');
    expect(failure(await decrypt(rfc7520Dir, rfc7516A1Key))).toBe('key-type');
    expect(failure(await decrypt(rfc7520Dir, { ...rfc7520DirKey, use: 'sig' }))).toBe('key-use');
    expect(failure(await decrypt(rfc7520Dir, { ...rfc7520DirKey, alg: 'A256GCM' }))).toBe(
      'key-alg',
    );
    expect(failure(await decrypt(rfc7520Dir, ''))).toBe('key-empty');
  });

  it('selects JWKS keys by kid', async () => {
    const jwks = { keys: [rfc7520KwKey, rfc7520DirKey] };
    expect(plaintext(await decrypt(rfc7520Dir, jwks))).toContain(cookbook);
    const other = { keys: [rfc7520KwKey] };
    expect(failure(await decrypt(rfc7520Dir, other))).toBe('kid-not-found');
  });
});
