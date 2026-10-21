import { describe, expect, it } from 'vitest';
import {
  computePeDniChecks,
  computeRucDv,
  formatPeDni,
  formatRuc,
  generatePeDni,
  generateRuc,
  validatePeDni,
  validateRuc,
} from './peru';

describe('Peru DNI', () => {
  it('accepts 8 digits with an optional check character', () => {
    expect(validatePeDni('12345678')).toEqual({ valid: true, formatted: '12345678' });
    expect(validatePeDni('12345678-1')).toEqual({ valid: true, formatted: '12345678-1' });
    expect(validatePeDni('12345678e')).toEqual({ valid: true, formatted: '12345678-E' });
  });

  it('computes both check character variants', () => {
    expect(computePeDniChecks('12345678')).toEqual({ number: '1', letter: 'E' });
  });

  it('rejects a wrong check character and bad lengths', () => {
    expect(validatePeDni('12345678-2')).toEqual({
      valid: false,
      reason: 'dv',
      expected: '1/E',
    });
    expect(validatePeDni('1234567')).toEqual({ valid: false, reason: 'format' });
  });

  it('formats and generates', () => {
    expect(formatPeDni('12345678 1', 'plain')).toBe('123456781');
    expect(formatPeDni('nope')).toBeNull();
    expect(generatePeDni(() => 0)).toBe('10000000');
    expect(validatePeDni(generatePeDni()).valid).toBe(true);
  });
});

describe('Peru RUC', () => {
  it('accepts the SUNAT RUC', () => {
    expect(validateRuc('20131312955')).toEqual({ valid: true, formatted: '20131312955' });
  });

  it.each([
    ['2013131295', '5'],
    ['1012345678', '1'],
  ])('computes the check digit of %s', (base, dv) => {
    expect(computeRucDv(base)).toBe(dv);
  });

  it('rejects wrong check digits and prefixes', () => {
    expect(validateRuc('20131312954')).toEqual({ valid: false, reason: 'dv', expected: '5' });
    expect(validateRuc('30131312955')).toEqual({ valid: false, reason: 'format' });
    expect(formatRuc('2013131295')).toBeNull();
  });

  it('generates valid RUCs', () => {
    for (let index = 0; index < 100; index++) {
      expect(validateRuc(generateRuc()).valid).toBe(true);
    }
  });
});
