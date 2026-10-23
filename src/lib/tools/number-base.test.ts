import { describe, expect, it } from 'vitest';
import {
  convertBytes,
  formatAmount,
  groupDigits,
  humanBytes,
  parseByteSize,
  parseNumber,
  toBase,
  twosComplement,
} from './number-base';

describe('parseNumber', () => {
  it.each([
    ['255', 'auto', 255n, 10],
    ['0xff', 'auto', 255n, 16],
    ['0b1010', 'auto', 10n, 2],
    ['0o17', 'auto', 15n, 8],
    ['-0x10', 'auto', -16n, 16],
    ['ff', '16', 255n, 16],
    ['zz', '36', 1295n, 36],
    ['1_000_000', 'auto', 1000000n, 10],
  ] as const)('parses %j as %s', (input, base, value, radix) => {
    expect(parseNumber(input, base)).toEqual({ ok: true, number: { value, base: radix } });
  });

  it('handles values beyond 2^64', () => {
    const result = parseNumber('0xffffffffffffffffffff');
    expect(result.ok && result.number.value).toBe(2n ** 80n - 1n);
  });

  it('reports invalid digits and empty input', () => {
    expect(parseNumber('12a')).toEqual({
      ok: false,
      error: { code: 'invalidDigit', char: 'a', base: 10 },
    });
    expect(parseNumber('102', '2')).toMatchObject({ ok: false, error: { char: '2', base: 2 } });
    expect(parseNumber(' ')).toEqual({ ok: false, error: { code: 'empty' } });
    expect(parseNumber('0x')).toEqual({ ok: false, error: { code: 'empty' } });
  });
});

describe('formatting', () => {
  it('converts to bases and groups digits', () => {
    expect(toBase(-255n, 16)).toBe('-ff');
    expect(groupDigits('11111111', 4)).toBe('1111 1111');
    expect(groupDigits('-101', 2)).toBe('-1 01');
  });
});

describe('twosComplement', () => {
  it('encodes negatives', () => {
    expect(twosComplement(-1n, 8)).toEqual({
      width: 8,
      fits: true,
      unsigned: 255n,
      signed: -1n,
      binary: '11111111',
      hex: 'ff',
    });
  });

  it('reinterprets unsigned values as signed', () => {
    expect(twosComplement(200n, 8)).toMatchObject({ fits: true, signed: -56n });
    expect(twosComplement(0xffffffffn, 32)).toMatchObject({ signed: -1n });
  });

  it('flags values that do not fit', () => {
    expect(twosComplement(256n, 8).fits).toBe(false);
    expect(twosComplement(-129n, 8).fits).toBe(false);
  });
});

describe('bytes', () => {
  it.each([
    ['1536', 1536],
    ['1.5 KiB', 1536],
    ['2MB', 2_000_000],
    ['1 gib', 1024 ** 3],
    ['1e3 kb', 1_000_000],
    ['1,024 B', 1024],
  ])('parses %j', (input, bytes) => {
    expect(parseByteSize(input)).toEqual({ ok: true, bytes });
  });

  it('rejects unknown units', () => {
    expect(parseByteSize('3 parsecs')).toEqual({
      ok: false,
      error: { code: 'invalidSize', input: '3 parsecs' },
    });
    expect(parseByteSize('')).toEqual({ ok: false, error: { code: 'empty' } });
  });

  it('converts to every unit', () => {
    expect(convertBytes(1536).find((entry) => entry.unit === 'KiB')?.value).toBe(1.5);
    expect(convertBytes(1536).find((entry) => entry.unit === 'KB')?.value).toBe(1.536);
  });

  it('formats amounts and human sizes', () => {
    expect(formatAmount(0.1 + 0.2)).toBe('0.3');
    expect(formatAmount(1.536e-9)).toBe('1.536e-9');
    expect(humanBytes(1536)).toBe('1.5 KiB');
    expect(humanBytes(1_500_000, false)).toBe('1.5 MB');
  });
});
