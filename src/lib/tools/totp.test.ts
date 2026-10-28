import { describe, expect, it } from 'vitest';
import {
  base32Decode,
  groupCode,
  hotp,
  parseOtpauth,
  readOtpInput,
  secondsRemaining,
  totpCounter,
} from './totp';

const ascii = (text: string) => Uint8Array.from(text, (char) => char.charCodeAt(0));
const bytes = (value: Uint8Array | null) => (value ? Array.from(value) : null);
const SHA1_KEY = ascii('12345678901234567890');
const SHA256_KEY = ascii('12345678901234567890123456789012');
const SHA512_KEY = ascii('1234567890123456789012345678901234567890123456789012345678901234');

describe('base32Decode', () => {
  it('decodes RFC 4648 base32 ignoring case, spaces, dashes and padding', () => {
    expect(bytes(base32Decode('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'))).toEqual(bytes(SHA1_KEY));
    expect(bytes(base32Decode('gezd gnbv-gy3t qojq gezd gnbv gy3t qojq'))).toEqual(bytes(SHA1_KEY));
    expect(bytes(base32Decode('MZXW6==='))).toEqual(bytes(ascii('foo')));
  });

  it('rejects invalid characters and empty input', () => {
    expect(base32Decode('ABC1')).toBeNull();
    expect(base32Decode('  ')).toBeNull();
  });
});

describe('hotp (RFC 4226 appendix D)', () => {
  it.each([
    [0, '755224'],
    [1, '287082'],
    [2, '359152'],
    [9, '520489'],
  ])('counter %i → %s', async (counter, code) => {
    expect(await hotp(SHA1_KEY, counter, 'SHA1', 6)).toBe(code);
  });
});

describe('totp (RFC 6238 appendix B)', () => {
  it.each([
    [59, 'SHA1', SHA1_KEY, '94287082'],
    [1111111109, 'SHA1', SHA1_KEY, '07081804'],
    [1234567890, 'SHA1', SHA1_KEY, '89005924'],
    [20000000000, 'SHA1', SHA1_KEY, '65353130'],
    [59, 'SHA256', SHA256_KEY, '46119246'],
    [1111111109, 'SHA256', SHA256_KEY, '68084774'],
    [59, 'SHA512', SHA512_KEY, '90693936'],
    [2000000000, 'SHA512', SHA512_KEY, '38618901'],
  ] as const)('T=%i %s → %s', async (seconds, algorithm, key, code) => {
    expect(await hotp(key, totpCounter(seconds * 1000, 30), algorithm, 8)).toBe(code);
  });

  it('counts the seconds left in the step', () => {
    expect(secondsRemaining(0, 30)).toBe(30);
    expect(secondsRemaining(29_999, 30)).toBe(1);
    expect(secondsRemaining(61_000, 60)).toBe(59);
  });
});

describe('parseOtpauth', () => {
  it('reads secret, issuer, label and parameters', () => {
    expect(
      parseOtpauth(
        'otpauth://totp/ACME%20Co:jane@example.com?secret=GEZDGNBV&issuer=ACME%20Co&algorithm=SHA256&digits=8&period=60',
      ),
    ).toEqual({
      secret: 'GEZDGNBV',
      label: 'jane@example.com',
      issuer: 'ACME Co',
      config: { type: 'totp', algorithm: 'SHA256', digits: 8, period: 60 },
    });
  });

  it('takes the issuer from the label prefix and reads the HOTP counter', () => {
    expect(parseOtpauth('otpauth://hotp/GitHub:me?secret=GEZDGNBV&counter=5')).toEqual({
      secret: 'GEZDGNBV',
      label: 'me',
      issuer: 'GitHub',
      config: { type: 'hotp', counter: 5 },
    });
  });

  it('rejects other URIs and a missing secret', () => {
    expect(parseOtpauth('https://example.com')).toBe('badUri');
    expect(parseOtpauth('otpauth://totp/x?issuer=a')).toBe('missingSecret');
  });
});

describe('readOtpInput', () => {
  it('accepts a bare secret or an otpauth URI', () => {
    const plain = readOtpInput('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    expect(plain.ok && bytes(plain.key)).toEqual(bytes(SHA1_KEY));
    expect(readOtpInput('otpauth://totp/x?secret=MZXW6')).toMatchObject({
      ok: true,
      account: { config: { type: 'totp' } },
    });
  });

  it('reports what is wrong', () => {
    expect(readOtpInput('')).toEqual({ ok: false, error: 'empty' });
    expect(readOtpInput('not base32!')).toEqual({ ok: false, error: 'badBase32' });
    expect(readOtpInput('otpauth://nope/x?secret=A')).toEqual({ ok: false, error: 'badUri' });
  });
});

describe('groupCode', () => {
  it('splits codes in two halves', () => {
    expect(groupCode('123456')).toBe('123 456');
    expect(groupCode('1234567')).toBe('1234 567');
    expect(groupCode('12345678')).toBe('1234 5678');
  });
});
