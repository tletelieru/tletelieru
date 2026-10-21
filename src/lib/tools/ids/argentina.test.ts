import { describe, expect, it } from 'vitest';
import {
  computeCuitDv,
  formatArDni,
  formatCuit,
  generateArDni,
  generateCuit,
  validateArDni,
  validateCuit,
} from './argentina';

describe('Argentina DNI', () => {
  it('validates length only', () => {
    expect(validateArDni('12.345.678')).toEqual({ valid: true, formatted: '12.345.678' });
    expect(validateArDni('1234567')).toEqual({ valid: true, formatted: '1.234.567' });
    expect(validateArDni('123456')).toEqual({ valid: false, reason: 'format' });
    expect(validateArDni('')).toEqual({ valid: false, reason: 'empty' });
  });

  it('formats with and without dots', () => {
    expect(formatArDni('12345678')).toBe('12.345.678');
    expect(formatArDni('12.345.678', 'plain')).toBe('12345678');
    expect(formatArDni('abc')).toBeNull();
  });

  it('generates 8-digit DNIs', () => {
    expect(generateArDni(() => 0)).toBe('10000000');
    expect(validateArDni(generateArDni()).valid).toBe(true);
  });
});

describe('Argentina CUIT / CUIL', () => {
  it('accepts the AFIP CUIT', () => {
    expect(validateCuit('33-69345023-9')).toEqual({ valid: true, formatted: '33-69345023-9' });
  });

  it.each([
    ['2012345678', '6'],
    ['2000000000', '1'],
    ['2000000001', null],
  ])('computes the check digit of %s', (base, dv) => {
    expect(computeCuitDv(base)).toBe(dv);
  });

  it('rejects wrong check digits, remainder 10 and unknown prefixes', () => {
    expect(validateCuit('20-12345678-5')).toEqual({ valid: false, reason: 'dv', expected: '6' });
    expect(validateCuit('20-00000001-0')).toEqual({ valid: false, reason: 'dv' });
    expect(validateCuit('21-12345678-6')).toEqual({ valid: false, reason: 'format' });
    expect(validateCuit('2012345678')).toEqual({ valid: false, reason: 'format' });
  });

  it('formats with and without dashes', () => {
    expect(formatCuit('20123456786')).toBe('20-12345678-6');
    expect(formatCuit('20-12345678-6', 'plain')).toBe('20123456786');
  });

  it('generates valid CUITs and skips the remainder-10 case', () => {
    for (let index = 0; index < 200; index++) {
      expect(validateCuit(generateCuit()).valid).toBe(true);
    }
    const values = [0, 0, 0, 0, 0, 0, 0, 0, 0.1];
    let call = 0;
    const cuit = generateCuit(() => values[call++] ?? 0);
    expect(cuit).toBe('20000000028');
    expect(validateCuit(cuit).valid).toBe(true);
  });
});
