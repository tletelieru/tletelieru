import { describe, expect, it } from 'vitest';
import { computeCpfDv, formatCpf, generateCpfs, parseCpf, validateCpf } from './cpf';

describe('computeCpfDv', () => {
  it.each([
    ['529982247', '25'],
    ['111444777', '35'],
    ['123456789', '09'],
  ])('computes the check digits of %s', (base, dv) => {
    expect(computeCpfDv(base)).toBe(dv);
  });
});

describe('parseCpf', () => {
  it.each(['529.982.247-25', '52998224725', ' 529 982 247 25 ', '529982247-25'])(
    'accepts %s',
    (input) => {
      expect(parseCpf(input)).toBe('52998224725');
    },
  );

  it.each(['', 'abc', '529.982.247-2', '5299822472555', '529.982.247/25'])(
    'rejects %s',
    (input) => {
      expect(parseCpf(input)).toBeNull();
    },
  );
});

describe('formatCpf', () => {
  it('masks by default', () => {
    expect(formatCpf('12345678909')).toBe('123.456.789-09');
  });

  it('unmasks', () => {
    expect(formatCpf('123.456.789-09', { style: 'plain' })).toBe('12345678909');
  });

  it('keeps only the check digit dash', () => {
    expect(formatCpf('123.456.789-09', { style: 'dash' })).toBe('123456789-09');
  });

  it('returns null for malformed input', () => {
    expect(formatCpf('hello')).toBeNull();
  });
});

describe('validateCpf', () => {
  it('accepts a valid CPF and returns the masked value', () => {
    expect(validateCpf('52998224725')).toEqual({ valid: true, formatted: '529.982.247-25' });
  });

  it('reports the expected check digits on mismatch', () => {
    expect(validateCpf('529.982.247-26')).toEqual({
      valid: false,
      reason: 'dv',
      expected: '25',
    });
  });

  it('rejects repeated digits even though they pass mod 11', () => {
    expect(validateCpf('111.111.111-11')).toEqual({ valid: false, reason: 'repeated' });
    expect(validateCpf('00000000000')).toEqual({ valid: false, reason: 'repeated' });
  });

  it('distinguishes empty and malformed input', () => {
    expect(validateCpf('  ')).toEqual({ valid: false, reason: 'empty' });
    expect(validateCpf('nope')).toEqual({ valid: false, reason: 'format' });
  });
});

describe('generateCpfs', () => {
  it('generates the requested amount of valid CPFs', () => {
    const cpfs = generateCpfs({ count: 50 });
    expect(cpfs).toHaveLength(50);
    for (const cpf of cpfs) expect(validateCpf(cpf).valid).toBe(true);
  });

  it('respects the mask option and the random source', () => {
    const [cpf] = generateCpfs({ style: 'plain' }, () => 0);
    expect(cpf).toMatch(/^\d{11}$/);
    expect(cpf.startsWith('000000001')).toBe(true);
    expect(validateCpf(cpf).valid).toBe(true);
    expect(generateCpfs({ count: 1 }, () => 0.5)[0]).toBe('555.555.556-36');
  });
});
