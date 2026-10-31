import { describe, expect, it } from 'vitest';
import { formatDecimal } from './decimal';
import {
  detectNumberFormat,
  parseAmount,
  parseWithSeparators,
  resolveNumberFormat,
} from './localized-number';

function amount(text: string, format: 'comma' | 'dot'): string | null {
  const value = parseAmount(text, format);
  return value && formatDecimal(value);
}

describe('parseAmount', () => {
  it.each([
    ['1.234,56', 'comma', '1234.56'],
    ['1,234.56', 'dot', '1234.56'],
    ['$ 1.234.567', 'comma', '1234567'],
    ['-1.234,5', 'comma', '-1234.5'],
    ['(1,000.25)', 'dot', '-1000.25'],
    ['1 234,56', 'comma', '1234.56'],
    ['USD 12.50', 'dot', '12.50'],
    ['CLP 1.000', 'comma', '1000'],
    ['1.500-', 'comma', '-1500'],
    ['-$20', 'dot', '-20'],
    ['$-20', 'dot', '-20'],
    ['R$ 10,50', 'comma', '10.50'],
    ['1000', 'dot', '1000'],
  ] as const)('reads %s', (text, format, expected) => {
    expect(amount(text, format)).toBe(expected);
  });

  it.each([
    ['abc', 'dot'],
    ['', 'dot'],
    ['1.2.3', 'dot'],
    ['12,34', 'dot'],
    ['12a34', 'dot'],
    ['1.23', 'comma'],
    ['-1-', 'dot'],
  ] as const)('rejects %s', (text, format) => {
    expect(amount(text, format)).toBeNull();
  });

  it('keeps precision beyond doubles', () => {
    expect(amount('12.345.678.901.234.567,89', 'comma')).toBe('12345678901234567.89');
  });
});

describe('parseWithSeparators', () => {
  it('accepts Indian grouping and whitespace groups', () => {
    const indian = parseWithSeparators('12,34,567.8', ',', '.');
    expect(indian && formatDecimal(indian.value)).toBe('1234567.8');
    const french = parseWithSeparators('1 234,5', ' ', ',');
    expect(french && formatDecimal(french.value)).toBe('1234.5');
  });

  it('flags percent', () => {
    expect(parseWithSeparators('12,5 %', '.', ',')?.percent).toBe(true);
  });
});

describe('detectNumberFormat', () => {
  it.each([
    [['1.234,56'], 'comma', false],
    [['1,234.56'], 'dot', false],
    [['1,5', '2'], 'comma', false],
    [['1.5'], 'dot', false],
    [['1.234.567'], 'comma', false],
    [['1,234,567'], 'dot', false],
    [['0.123'], 'dot', false],
    [['1.234', '2,5'], 'comma', false],
    [['1.234'], 'dot', true],
    [['1000'], 'dot', false],
  ] as const)('detects %j', (values, format, ambiguous) => {
    expect(detectNumberFormat(values)).toEqual({ format, ambiguous });
  });

  it('uses the fallback for ambiguous input', () => {
    expect(detectNumberFormat(['1.234'], 'comma')).toEqual({ format: 'comma', ambiguous: true });
  });

  it('respects an explicit choice', () => {
    expect(resolveNumberFormat(['1,5'], 'dot')).toEqual({ format: 'dot', ambiguous: false });
  });
});
