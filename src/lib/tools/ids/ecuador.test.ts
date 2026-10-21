import { describe, expect, it } from 'vitest';
import { computeEcCedulaDv, formatEcCedula, generateEcCedula, validateEcCedula } from './ecuador';

describe('Ecuador cédula', () => {
  it('accepts a known cédula', () => {
    expect(validateEcCedula('1710034065')).toEqual({ valid: true, formatted: '1710034065' });
  });

  it('computes the check digit', () => {
    expect(computeEcCedulaDv('171003406')).toBe('5');
  });

  it('rejects wrong check digits, provinces and third digits', () => {
    expect(validateEcCedula('1710034064')).toEqual({ valid: false, reason: 'dv', expected: '5' });
    expect(validateEcCedula('2510034065')).toEqual({ valid: false, reason: 'format' });
    expect(validateEcCedula('1770034065')).toEqual({ valid: false, reason: 'format' });
    expect(validateEcCedula('171003406')).toEqual({ valid: false, reason: 'format' });
  });

  it('formats and generates', () => {
    expect(formatEcCedula('1710034065')).toBe('171003406-5');
    expect(formatEcCedula('171003406-5', 'plain')).toBe('1710034065');
    for (let index = 0; index < 100; index++) {
      expect(validateEcCedula(generateEcCedula()).valid).toBe(true);
    }
  });
});
