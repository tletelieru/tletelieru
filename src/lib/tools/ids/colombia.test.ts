import { describe, expect, it } from 'vitest';
import {
  computeNitDv,
  formatCoCc,
  formatNit,
  generateCoCc,
  generateNit,
  validateCoCc,
  validateNit,
} from './colombia';

describe('Colombia CC', () => {
  it('validates 6 to 10 digits', () => {
    expect(validateCoCc('1.020.304.050')).toEqual({ valid: true, formatted: '1.020.304.050' });
    expect(validateCoCc('12345')).toEqual({ valid: false, reason: 'format' });
    expect(validateCoCc('12345678901')).toEqual({ valid: false, reason: 'format' });
  });

  it('formats and generates', () => {
    expect(formatCoCc('79123456')).toBe('79.123.456');
    expect(formatCoCc('79.123.456', 'plain')).toBe('79123456');
    expect(validateCoCc(generateCoCc()).valid).toBe(true);
  });
});

describe('Colombia NIT', () => {
  it('accepts the DIAN NIT', () => {
    expect(validateNit('800.197.268-4')).toEqual({ valid: true, formatted: '800.197.268-4' });
    expect(validateNit('8001972684').valid).toBe(true);
  });

  it.each([
    ['800197268', '4'],
    ['900123456', '8'],
  ])('computes the check digit of %s', (body, dv) => {
    expect(computeNitDv(body)).toBe(dv);
  });

  it('rejects wrong check digits', () => {
    expect(validateNit('800197268-5')).toEqual({ valid: false, reason: 'dv', expected: '4' });
    expect(validateNit('abc')).toEqual({ valid: false, reason: 'format' });
  });

  it('formats and generates', () => {
    expect(formatNit('8001972684')).toBe('800.197.268-4');
    expect(formatNit('8001972684', 'dash')).toBe('800197268-4');
    expect(formatNit('800.197.268-4', 'plain')).toBe('8001972684');
    for (let index = 0; index < 100; index++) {
      expect(validateNit(generateNit()).valid).toBe(true);
    }
  });
});
