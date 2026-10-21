import { describe, expect, it } from 'vitest';
import {
  computeDniLetter,
  computeNieLetter,
  formatEsDni,
  formatNie,
  generateEsDni,
  generateNie,
  generateNif,
  validateEsDni,
  validateNie,
  validateNif,
} from './spain';

describe('Spain DNI', () => {
  it('computes the control letter', () => {
    expect(computeDniLetter('12345678')).toBe('Z');
    expect(computeDniLetter('00000000')).toBe('T');
  });

  it('validates and formats', () => {
    expect(validateEsDni('12345678-z')).toEqual({ valid: true, formatted: '12345678Z' });
    expect(validateEsDni('12345678A')).toEqual({ valid: false, reason: 'dv', expected: 'Z' });
    expect(validateEsDni('X1234567L')).toEqual({ valid: false, reason: 'format' });
    expect(formatEsDni('12345678Z')).toBe('12345678-Z');
    expect(formatEsDni('12345678-Z', 'plain')).toBe('12345678Z');
  });
});

describe('Spain NIE', () => {
  it('computes the control letter with the X/Y/Z prefix', () => {
    expect(computeNieLetter('X', '1234567')).toBe('L');
    expect(computeNieLetter('Y', '0000000')).toBe('Z');
  });

  it('validates and formats', () => {
    expect(validateNie('X1234567L')).toEqual({ valid: true, formatted: 'X1234567L' });
    expect(validateNie('X1234567A')).toEqual({ valid: false, reason: 'dv', expected: 'L' });
    expect(formatNie('x1234567l')).toBe('X-1234567-L');
  });
});

describe('Spain NIF', () => {
  it('accepts both DNI and NIE', () => {
    expect(validateNif('12345678Z').valid).toBe(true);
    expect(validateNif('X1234567L').valid).toBe(true);
    expect(validateNif('B12345678')).toEqual({ valid: false, reason: 'format' });
  });

  it('generates valid documents', () => {
    for (let index = 0; index < 100; index++) {
      expect(validateEsDni(generateEsDni()).valid).toBe(true);
      expect(validateNie(generateNie()).valid).toBe(true);
      expect(validateNif(generateNif()).valid).toBe(true);
    }
  });
});
