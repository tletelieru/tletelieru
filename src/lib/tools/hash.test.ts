import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  decodeKey,
  digest,
  digestAll,
  encodeDigest,
  fromBase64,
  fromHex,
  guessAlgorithms,
  hmac,
  hmacAll,
  toBase64,
  toHex,
  utf8,
  verifyDigest,
  type HashAlgorithm,
} from './hash';
import { hmacMd5, md5 } from './hash/md5';

function repeat(byte: number, length: number) {
  return new Uint8Array(length).fill(byte);
}

describe('md5 (RFC 1321 test suite)', () => {
  it.each([
    ['', 'd41d8cd98f00b204e9800998ecf8427e'],
    ['a', '0cc175b9c0f1b6a831c399e269772661'],
    ['abc', '900150983cd24fb0d6963f7d28e17f72'],
    ['message digest', 'f96b697d7cb7938d525a2f31aaf161d0'],
    ['abcdefghijklmnopqrstuvwxyz', 'c3fcd3d76192e4007dfb496cca67e13b'],
    [
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
      'd174ab98d277d9f5a5611c2c9f419d9f',
    ],
    ['1234567890'.repeat(8), '57edf4a22be3c955ac49da2e2107b67a'],
  ])('md5(%j)', (input, expected) => {
    expect(toHex(md5(utf8(input)))).toBe(expected);
  });

  it('matches node:crypto across block boundaries and UTF-8 input', () => {
    for (let length = 0; length <= 200; length++) {
      const text = 'ñ€a'.repeat(length).slice(0, length);
      expect(toHex(md5(utf8(text)))).toBe(createHash('md5').update(text, 'utf8').digest('hex'));
    }
  });
});

describe('hmacMd5 (RFC 2202)', () => {
  it.each([
    [repeat(0x0b, 16), utf8('Hi There'), '9294727a3638bb1c13f48ef8158bfc9d'],
    [utf8('Jefe'), utf8('what do ya want for nothing?'), '750c783e6ab0b503eaa86e310a5db738'],
    [repeat(0xaa, 16), repeat(0xdd, 50), '56be34521d144c88dbb8c733f0e8b3f6'],
    [
      repeat(0xaa, 80),
      utf8('Test Using Larger Than Block-Size Key - Hash Key First'),
      '6b1ab7fe4bd7bf8f0b62e6ce61b9d0cd',
    ],
  ])('test case %#', (key, data, expected) => {
    expect(toHex(hmacMd5(key, data))).toBe(expected);
  });
});

describe('digest (FIPS 180 vectors)', () => {
  const abc: Record<HashAlgorithm, string> = {
    md5: '900150983cd24fb0d6963f7d28e17f72',
    sha1: 'a9993e364706816aba3e25717850c26c9cd0d89d',
    sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    sha384:
      'cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7',
    sha512:
      'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f',
  };
  const empty: Record<HashAlgorithm, string> = {
    md5: 'd41d8cd98f00b204e9800998ecf8427e',
    sha1: 'da39a3ee5e6b4b0d3255bfef95601890afd80709',
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    sha384:
      '38b060a751ac96384cd9327eb1b1e36a21fdb71114be07434c0cc7bf63f6e1da274edebfe76f65fbd51ad2f14898b95b',
    sha512:
      'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e',
  };

  it('hashes "abc" with every algorithm', async () => {
    const all = await digestAll(utf8('abc'));
    for (const [algorithm, hex] of Object.entries(abc)) {
      expect(toHex(all[algorithm as HashAlgorithm])).toBe(hex);
    }
  });

  it('hashes the empty string with every algorithm', async () => {
    const all = await digestAll(utf8(''));
    for (const [algorithm, hex] of Object.entries(empty)) {
      expect(toHex(all[algorithm as HashAlgorithm])).toBe(hex);
    }
  });

  it('hashes a single algorithm', async () => {
    expect(toHex(await digest('sha256', utf8('abc')))).toBe(abc.sha256);
  });
});

describe('hmac (RFC 4231 / RFC 2202)', () => {
  it.each([
    [
      repeat(0x0b, 20),
      utf8('Hi There'),
      'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7',
    ],
    [
      utf8('Jefe'),
      utf8('what do ya want for nothing?'),
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    ],
    [
      repeat(0xaa, 20),
      repeat(0xdd, 50),
      '773ea91e36800e46854db8ebd09181a72959098b3ef8c122d9635514ced565fe',
    ],
    [
      repeat(0xaa, 131),
      utf8('Test Using Larger Than Block-Size Key - Hash Key First'),
      '60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54',
    ],
  ])('HMAC-SHA256 test case %#', async (key, data, expected) => {
    expect(toHex(await hmac('sha256', key, data))).toBe(expected);
  });

  it('computes every HMAC for RFC 4231 test case 2', async () => {
    const all = await hmacAll(utf8('Jefe'), utf8('what do ya want for nothing?'));
    expect(toHex(all.md5)).toBe('750c783e6ab0b503eaa86e310a5db738');
    expect(toHex(all.sha1)).toBe('effcdf6ae5eb2fa2d27416d5f184df9c259a7c79');
    expect(toHex(all.sha512)).toBe(
      '164b7a7bfcf819e2e395fbe73b56e0a387bd64222e831fd610270cd7ea2505549758bf75c05a994a6d034f65f8f0e6fdcaeab1a34d4a6b4b636e070a38bce737',
    );
  });

  it('accepts an empty key', async () => {
    expect(toHex(await hmac('sha256', utf8(''), utf8('')))).toBe(
      'b613679a0814d9ec772f95d778c35fc5ff1697c493715653c6c712144292c5ad',
    );
    expect(toHex(await hmac('md5', utf8(''), utf8('')))).toBe('74e6f7298a9c2d168935f58c001bad88');
  });
});

describe('encoding helpers', () => {
  const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0xfb]);

  it('encodes digests as hex, upper hex and base64', () => {
    expect(encodeDigest(bytes, 'hex')).toBe('deadbeeffb');
    expect(encodeDigest(bytes, 'HEX')).toBe('DEADBEEFFB');
    expect(encodeDigest(bytes, 'base64')).toBe('3q2+7/s=');
  });

  it('decodes hex and base64 (standard and url-safe)', () => {
    expect(fromHex('DE ad be EF fb')).toEqual(bytes);
    expect(fromHex('0xdeadbeeffb')).toEqual(bytes);
    expect(fromHex('abc')).toBeNull();
    expect(fromHex('zz')).toBeNull();
    expect(fromBase64('3q2+7/s=')).toEqual(bytes);
    expect(fromBase64('3q2-7_s')).toEqual(bytes);
    expect(fromBase64('a')).toBeNull();
    expect(fromBase64('**')).toBeNull();
    expect(toBase64(new Uint8Array())).toBe('');
  });

  it('decodes HMAC keys by encoding', () => {
    for (const [text, encoding] of [
      ['Jefe', 'text'],
      ['4a656665', 'hex'],
      ['SmVmZQ==', 'base64'],
    ] as const) {
      const result = decodeKey(text, encoding);
      expect(result.ok && toHex(result.bytes)).toBe('4a656665');
    }
    expect(decodeKey('xyz', 'hex')).toEqual({ ok: false, error: 'invalid-hex' });
    expect(decodeKey('@@', 'base64')).toEqual({ ok: false, error: 'invalid-base64' });
  });
});

describe('verifyDigest', () => {
  it('matches hex case-insensitively and base64 exactly', async () => {
    const all = await digestAll(utf8('abc'));
    expect(
      verifyDigest('  BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD\n', all),
    ).toEqual({
      status: 'match',
      algorithm: 'sha256',
      format: 'hex',
    });
    expect(verifyDigest(toBase64(all.sha1), all)).toEqual({
      status: 'match',
      algorithm: 'sha1',
      format: 'base64',
    });
    expect(verifyDigest('', all)).toEqual({ status: 'empty' });
  });

  it('reports a mismatch with the algorithms that fit the length', async () => {
    const all = await digestAll(utf8('abd'));
    expect(verifyDigest('900150983cd24fb0d6963f7d28e17f72', all)).toEqual({
      status: 'mismatch',
      candidates: ['md5'],
    });
    expect(guessAlgorithms('nope!')).toEqual([]);
  });
});
