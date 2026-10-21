import { describe, expect, it } from 'vitest';
import { computeUyCiDv, formatUyCi, generateUyCi, validateUyCi } from './uruguay';

describe('Uruguay CI', () => {
  it.each([
    ['1234567', '2'],
    ['123456', '1'],
  ])('computes the check digit of %s', (body, dv) => {
    expect(computeUyCiDv(body)).toBe(dv);
  });

  it('validates with and without separators', () => {
    expect(validateUyCi('1.234.567-2')).toEqual({ valid: true, formatted: '1.234.567-2' });
    expect(validateUyCi('12345672').valid).toBe(true);
    expect(validateUyCi('1.234.567-3')).toEqual({ valid: false, reason: 'dv', expected: '2' });
    expect(validateUyCi('123')).toEqual({ valid: false, reason: 'format' });
  });

  it('formats and generates', () => {
    expect(formatUyCi('12345672')).toBe('1.234.567-2');
    expect(formatUyCi('12345672', 'dash')).toBe('1234567-2');
    expect(formatUyCi('1.234.567-2', 'plain')).toBe('12345672');
    for (let index = 0; index < 100; index++) {
      expect(validateUyCi(generateUyCi()).valid).toBe(true);
    }
  });
});
