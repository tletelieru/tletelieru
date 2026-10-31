import { describe, expect, it } from 'vitest';
import {
  currencies,
  currencyOptions,
  findCurrency,
  minorCurrencies,
  searchCurrencies,
} from './iso-4217';

describe('iso 4217 data', () => {
  it('has unique well-formed codes', () => {
    expect(new Set(currencies.map((c) => c.code)).size).toBe(currencies.length);
    expect(new Set(currencies.map((c) => c.numeric)).size).toBe(currencies.length);
    for (const currency of currencies) {
      expect(currency.code).toMatch(/^[A-Z]{3}$/);
      expect(currency.numeric).toMatch(/^\d{3}$/);
      expect(currency.name.en).not.toBe('');
      expect(currency.name.es).not.toBe('');
    }
  });

  it.each([
    ['CLP', '152', 0],
    ['USD', '840', 2],
    ['KWD', '414', 3],
    ['CLF', '990', 4],
    ['JPY', '392', 0],
    ['EUR', '978', 2],
    ['XAU', '959', null],
  ])('%s', (code, numeric, minor) => {
    expect(findCurrency(code)).toMatchObject({ numeric, minor });
  });

  it('excludes units without minor digits from the amount list', () => {
    expect(minorCurrencies.some((c) => c.code === 'XAU')).toBe(false);
    expect(currencyOptions('es').find((o) => o.value === 'CLP')?.label).toBe('CLP · Peso chileno');
  });

  it('finds lowercase codes and misses unknown ones', () => {
    expect(findCurrency(' clp ')?.code).toBe('CLP');
    expect(findCurrency('ZZZ')).toBeUndefined();
  });
});

describe('searchCurrencies', () => {
  it('returns everything for an empty query', () => {
    expect(searchCurrencies('  ')).toHaveLength(currencies.length);
  });

  it.each([
    ['clp', 'CLP'],
    ['152', 'CLP'],
    ['CL', 'CLF'],
    ['dolar estadounidense', 'USD'],
    ['Swiss', 'CHF'],
  ])('finds %s', (query, code) => {
    expect(searchCurrencies(query)[0]?.code).toBe(code);
  });

  it('searches localized country names when given', () => {
    const names: Record<string, string> = { DE: 'Alemania' };
    const found = searchCurrencies('alemania', (code) => names[code] ?? code);
    expect(found.map((c) => c.code)).toEqual(['EUR']);
  });

  it('returns nothing without a match', () => {
    expect(searchCurrencies('zzzz')).toEqual([]);
  });
});
