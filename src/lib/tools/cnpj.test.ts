import { describe, expect, it } from 'vitest';
import {
  computeCnpjDv,
  formatCnpj,
  generateCnpjs,
  isAlphanumericCnpj,
  parseCnpj,
  validateCnpj,
} from './cnpj';

describe('computeCnpjDv', () => {
  it.each([
    ['112223330001', '81'],
    ['123456780001', '95'],
    ['12ABC34501DE', '35'],
  ])('computes the check digits of %s', (base, dv) => {
    expect(computeCnpjDv(base)).toBe(dv);
  });
});

describe('parseCnpj', () => {
  it.each(['11.222.333/0001-81', '11222333000181', ' 11 222 333 0001 81 ', '12.abc.345/01de-35'])(
    'accepts %s',
    (input) => {
      expect(parseCnpj(input)).not.toBeNull();
    },
  );

  it.each(['', 'abc', '11.222.333/0001-8', '12ABC34501DE3X', '11.222.333/0001-811'])(
    'rejects %s',
    (input) => {
      expect(parseCnpj(input)).toBeNull();
    },
  );
});

describe('formatCnpj', () => {
  it('masks by default', () => {
    expect(formatCnpj('12345678000195')).toBe('12.345.678/0001-95');
    expect(formatCnpj('12abc34501de35')).toBe('12.ABC.345/01DE-35');
  });

  it('unmasks', () => {
    expect(formatCnpj('12.345.678/0001-95', { style: 'plain' })).toBe('12345678000195');
  });

  it('keeps only the check digit dash', () => {
    expect(formatCnpj('12.ABC.345/01DE-35', { style: 'dash' })).toBe('12ABC34501DE-35');
  });

  it('returns null for malformed input', () => {
    expect(formatCnpj('hello')).toBeNull();
  });
});

describe('validateCnpj', () => {
  it('accepts numeric and alphanumeric CNPJs', () => {
    expect(validateCnpj('11222333000181')).toEqual({
      valid: true,
      formatted: '11.222.333/0001-81',
    });
    expect(validateCnpj('12.ABC.345/01DE-35')).toEqual({
      valid: true,
      formatted: '12.ABC.345/01DE-35',
    });
  });

  it('reports the expected check digits on mismatch', () => {
    expect(validateCnpj('11.222.333/0001-82')).toEqual({
      valid: false,
      reason: 'dv',
      expected: '81',
    });
  });

  it('rejects repeated characters', () => {
    expect(validateCnpj('00.000.000/0000-00')).toEqual({ valid: false, reason: 'repeated' });
    expect(validateCnpj('11111111111111')).toEqual({ valid: false, reason: 'repeated' });
  });

  it('distinguishes empty and malformed input', () => {
    expect(validateCnpj('  ')).toEqual({ valid: false, reason: 'empty' });
    expect(validateCnpj('nope')).toEqual({ valid: false, reason: 'format' });
  });
});

describe('generateCnpjs', () => {
  it('generates valid numeric CNPJs', () => {
    const cnpjs = generateCnpjs({ count: 50 });
    expect(cnpjs).toHaveLength(50);
    for (const cnpj of cnpjs) {
      expect(cnpj).toMatch(/^\d{2}\.\d{3}\.\d{3}\/0001-\d{2}$/);
      expect(validateCnpj(cnpj).valid).toBe(true);
    }
  });

  it('generates valid alphanumeric CNPJs', () => {
    const cnpjs = generateCnpjs({ count: 50, alphanumeric: true, style: 'plain' });
    for (const cnpj of cnpjs) {
      expect(cnpj).toMatch(/^[0-9A-Z]{12}\d{2}$/);
      expect(validateCnpj(cnpj).valid).toBe(true);
    }
    expect(cnpjs.some(isAlphanumericCnpj)).toBe(true);
  });

  it('never emits a repeated CNPJ with a degenerate random source', () => {
    const [numeric] = generateCnpjs({ style: 'plain' }, () => 0);
    const [alphanumeric] = generateCnpjs({ style: 'plain', alphanumeric: true }, () => 0);
    expect(validateCnpj(numeric).valid).toBe(true);
    expect(validateCnpj(alphanumeric).valid).toBe(true);
  });
});
