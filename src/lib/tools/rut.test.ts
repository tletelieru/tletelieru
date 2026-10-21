import { describe, expect, it } from 'vitest';
import { computeRutDv, formatRut, generateRuts, parseRut, validateRut } from './rut';

describe('computeRutDv', () => {
  it.each([
    ['12345678', '5'],
    ['11111111', '1'],
    ['10000013', 'K'],
    ['14', '0'],
  ])('computes the check digit of %s', (body, dv) => {
    expect(computeRutDv(body)).toBe(dv);
  });
});

describe('parseRut', () => {
  it.each(['12.345.678-5', '12345678-5', '123456785', ' 12 345 678 5 ', '10.000.013-k'])(
    'accepts %s',
    (input) => {
      expect(parseRut(input)).not.toBeNull();
    },
  );

  it.each(['', 'abc', '12.345.678-X', '-5', '123456789-0', '12a45678-5'])('rejects %s', (input) => {
    expect(parseRut(input)).toBeNull();
  });

  it('strips leading zeros and uppercases K', () => {
    expect(parseRut('010.000.013-k')).toEqual({ body: '10000013', dv: 'K' });
  });
});

describe('formatRut', () => {
  it('formats with dots by default', () => {
    expect(formatRut('123456785')).toBe('12.345.678-5');
  });

  it.each([
    ['dots', '12.345.678-5'],
    ['dash', '12345678-5'],
    ['plain', '123456785'],
  ] as const)('formats with the %s style', (style, expected) => {
    expect(formatRut('12.345.678-5', { style })).toBe(expected);
  });

  it('formats the K check digit upper or lower case', () => {
    expect(formatRut('10000013k')).toBe('10.000.013-K');
    expect(formatRut('10.000.013-K', { upperK: false })).toBe('10.000.013-k');
    expect(formatRut('10000013K', { style: 'plain', upperK: false })).toBe('10000013k');
  });

  it('parses its own plain output back', () => {
    expect(formatRut('10000013k', { style: 'dash' })).toBe('10000013-K');
  });

  it('formats short bodies', () => {
    expect(formatRut('140')).toBe('14-0');
  });

  it('returns null for malformed input', () => {
    expect(formatRut('hello')).toBeNull();
  });
});

describe('validateRut', () => {
  it('accepts a valid RUT and returns the formatted value', () => {
    expect(validateRut('12345678-5')).toEqual({
      valid: true,
      body: '12345678',
      dv: '5',
      formatted: '12.345.678-5',
    });
  });

  it('reports the expected check digit on mismatch', () => {
    expect(validateRut('12.345.678-9')).toEqual({ valid: false, reason: 'dv', expectedDv: '5' });
  });

  it('formats the valid value with the requested style', () => {
    expect(validateRut('10000013K', { style: 'dash', upperK: false })).toMatchObject({
      valid: true,
      formatted: '10000013-k',
    });
  });

  it('distinguishes empty and malformed input', () => {
    expect(validateRut('  ')).toEqual({ valid: false, reason: 'empty' });
    expect(validateRut('nope')).toEqual({ valid: false, reason: 'format' });
  });
});

describe('generateRuts', () => {
  it('generates the requested amount of valid RUTs', () => {
    const ruts = generateRuts({ count: 50 });
    expect(ruts).toHaveLength(50);
    for (const rut of ruts) expect(validateRut(rut).valid).toBe(true);
  });

  it('respects range, format and the random source', () => {
    expect(generateRuts({ count: 1, min: 12345678, max: 12345678, style: 'dash' })).toEqual([
      '12345678-5',
    ]);
    expect(generateRuts({ min: 10000013, max: 10000013, style: 'plain', upperK: false })).toEqual([
      '10000013k',
    ]);
    expect(generateRuts({ min: 1_000_000, max: 1_000_009 }, () => 0)).toEqual(['1.000.000-9']);
  });
});
