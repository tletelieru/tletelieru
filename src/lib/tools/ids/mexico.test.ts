import { describe, expect, it } from 'vitest';
import {
  computeCurpDv,
  computeRfcDv,
  formatCurp,
  generateCurp,
  generateRfc,
  validateCurp,
  validateRfc,
} from './mexico';

describe('Mexico CURP', () => {
  it('accepts a known CURP', () => {
    expect(validateCurp('boxw310820hnerxn09')).toEqual({
      valid: true,
      formatted: 'BOXW310820HNERXN09',
    });
  });

  it('computes the check digit', () => {
    expect(computeCurpDv('BOXW310820HNERXN0')).toBe('9');
  });

  it('rejects bad structure and wrong check digits', () => {
    expect(validateCurp('BOXW310820HNERXN08')).toEqual({
      valid: false,
      reason: 'dv',
      expected: '9',
    });
    expect(validateCurp('BOXW311320HNERXN09')).toEqual({ valid: false, reason: 'format' });
    expect(validateCurp('BOXW310820HZZRXN09')).toEqual({ valid: false, reason: 'format' });
    expect(formatCurp('nope')).toBeNull();
  });

  it('generates valid CURPs', () => {
    for (let index = 0; index < 200; index++) {
      expect(validateCurp(generateCurp()).valid).toBe(true);
    }
    expect(validateCurp(generateCurp(() => 0)).valid).toBe(true);
  });
});

describe('Mexico RFC', () => {
  it('accepts a known persona física RFC', () => {
    expect(validateRfc('GODE561231GR8')).toEqual({ valid: true, formatted: 'GODE561231GR8' });
  });

  it('computes the homoclave check digit for física and moral', () => {
    expect(computeRfcDv('GODE561231GR')).toBe('8');
    expect(computeRfcDv('ABC680524P7')).toMatch(/^[\dA]$/);
  });

  it('rejects bad structure and wrong check digits', () => {
    expect(validateRfc('GODE561231GR7')).toEqual({ valid: false, reason: 'dv', expected: '8' });
    expect(validateRfc('GODE561331GR8')).toEqual({ valid: false, reason: 'format' });
    expect(validateRfc('GO561231GR8')).toEqual({ valid: false, reason: 'format' });
  });

  it('generates valid física and moral RFCs', () => {
    const rfcs = Array.from({ length: 200 }, () => generateRfc());
    for (const rfc of rfcs) expect(validateRfc(rfc).valid).toBe(true);
    expect(rfcs.some((rfc) => rfc.length === 12)).toBe(true);
    expect(rfcs.some((rfc) => rfc.length === 13)).toBe(true);
  });
});
