import { describe, expect, it } from 'vitest';
import {
  convertNumbers,
  formatLocalized,
  localeSeparators,
  numberLocales,
  parseLocalized,
  type NumberOptions,
} from './number-locale';

const base: NumberOptions = { locale: 'es-CL', style: 'plain', currency: 'CLP', decimals: null };

function clean(text: string | null): string | null {
  return text?.replace(/\s/g, ' ') ?? null;
}

describe('formatLocalized', () => {
  it.each([
    ['es-CL', '1.234,56'],
    ['en-US', '1,234.56'],
    ['pt-BR', '1.234,56'],
    ['de-DE', '1.234,56'],
    ['en-IN', '1,234.56'],
  ] as const)('plain in %s', (locale, expected) => {
    expect(clean(formatLocalized('1234.56', { ...base, locale }))).toBe(expected);
  });

  it('formats currency, percent and compact', () => {
    expect(
      clean(
        formatLocalized('1234.5', { ...base, style: 'currency', currency: 'USD', locale: 'en-US' }),
      ),
    ).toBe('$1,234.50');
    expect(
      clean(
        formatLocalized('1234.5', { ...base, style: 'currency', currency: 'BRL', locale: 'pt-BR' }),
      ),
    ).toBe('R$ 1.234,50');
    expect(clean(formatLocalized('0.1234', { ...base, style: 'percent', locale: 'en-US' }))).toBe(
      '12.34%',
    );
    expect(clean(formatLocalized('1234567', { ...base, style: 'compact', locale: 'en-US' }))).toBe(
      '1.2M',
    );
  });

  it('keeps digits beyond double precision', () => {
    expect(formatLocalized('9007199254740993.25', { ...base, locale: 'en-US' })).toBe(
      '9,007,199,254,740,993.25',
    );
  });

  it('fixes decimals when asked', () => {
    expect(formatLocalized('1.5', { ...base, locale: 'en-US', decimals: 3 })).toBe('1.500');
  });

  it('rejects non numbers', () => {
    expect(formatLocalized('abc', base)).toBeNull();
  });
});

describe('parseLocalized', () => {
  it.each([
    ['1.234,56', 'es-CL', '1234.56'],
    ['1,234.56', 'en-US', '1234.56'],
    ['R$ 1.234,50', 'pt-BR', '1234.5'],
    ['12,5 %', 'es-CL', '0.125'],
    ['-1.000', 'de-DE', '-1000'],
    ['12,34,567.5', 'en-IN', '1234567.5'],
  ] as const)('reads %s in %s', (text, locale, expected) => {
    expect(parseLocalized(text, locale)).toBe(expected);
  });

  it('rejects text that does not fit the locale', () => {
    expect(parseLocalized('1.23', 'es-CL')).toBeNull();
    expect(parseLocalized('abc', 'en-US')).toBeNull();
  });

  it.each(numberLocales)('round trips in %s', (locale) => {
    const options = { ...base, locale };
    expect(parseLocalized(formatLocalized('1234567.891', options) ?? '', locale)).toBe(
      '1234567.891',
    );
  });

  it('exposes separators', () => {
    expect(localeSeparators('es-CL')).toEqual({ group: '.', decimal: ',' });
    expect(localeSeparators('en-US')).toEqual({ group: ',', decimal: '.' });
  });
});

describe('convertNumbers', () => {
  it('processes each line and reports the bad ones', () => {
    expect(convertNumbers('1\nx\n\n2.5', 'format', base)).toEqual({
      output: '1\n2,5',
      errors: [{ line: 2, text: 'x' }],
    });
  });
});
