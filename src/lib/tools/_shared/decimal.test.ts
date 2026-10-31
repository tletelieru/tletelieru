import { describe, expect, it } from 'vitest';
import {
  add,
  compare,
  divide,
  formatDecimal,
  formatTrimmed,
  multiply,
  parseDecimal,
  power,
  round,
  roundingModes,
  sqrt,
  subtract,
  sum,
  type Decimal,
} from './decimal';

function d(text: string): Decimal {
  const value = parseDecimal(text);
  if (!value) throw new Error(text);
  return value;
}

describe('parseDecimal', () => {
  it.each([
    ['12.50', '12.50'],
    ['-0.05', '-0.05'],
    ['+7', '7'],
    ['.5', '0.5'],
    ['5.', '5'],
    ['1e3', '1000'],
    ['1.5e-2', '0.015'],
  ])('reads %s', (text, expected) => {
    expect(formatDecimal(d(text))).toBe(expected);
  });

  it.each(['', '.', 'abc', '1,5', '1e99999', '1.2.3', '--1'])('rejects %s', (text) => {
    expect(parseDecimal(text)).toBeNull();
  });
});

describe('arithmetic', () => {
  it('avoids binary float errors', () => {
    expect(formatTrimmed(add(d('0.1'), d('0.2')))).toBe('0.3');
    expect(formatTrimmed(multiply(d('1.1'), d('1.1')))).toBe('1.21');
    expect(formatTrimmed(subtract(d('0.3'), d('0.1')))).toBe('0.2');
  });

  it('handles values far beyond 2^53', () => {
    expect(formatDecimal(add(d('9007199254740993.01'), d('1')))).toBe('9007199254740994.01');
  });

  it('sums and compares', () => {
    expect(formatTrimmed(sum([d('1.10'), d('2.2'), d('-0.3')]))).toBe('3');
    expect(compare(d('1.10'), d('1.1'))).toBe(0);
    expect(compare(d('-2'), d('1'))).toBe(-1);
  });

  it('divides and takes roots at a fixed scale', () => {
    expect(formatDecimal(divide(d('1'), d('3'), 4))).toBe('0.3333');
    expect(formatDecimal(divide(d('2'), d('3'), 2))).toBe('0.67');
    expect(formatDecimal(sqrt(d('2'), 6))).toBe('1.414214');
    expect(formatDecimal(sqrt(d('0.25'), 2))).toBe('0.50');
    expect(formatDecimal(power(d('1.5'), 3, 6))).toBe('3.375000');
  });
});

describe('round', () => {
  const table: [string, string[]][] = [
    ['2.5', ['3', '2', '2', '3', '2', '3', '2']],
    ['3.5', ['4', '3', '4', '4', '3', '4', '3']],
    ['-2.5', ['-3', '-2', '-2', '-3', '-2', '-2', '-3']],
    ['2.1', ['2', '2', '2', '3', '2', '3', '2']],
    ['-2.1', ['-2', '-2', '-2', '-3', '-2', '-2', '-3']],
  ];

  it.each(table)('rounds %s in every mode', (value, expected) => {
    expect(roundingModes.map((mode) => formatDecimal(round(d(value), 0, mode)))).toEqual(expected);
  });

  it('pads when the target scale is larger', () => {
    expect(formatDecimal(round(d('1.5'), 3))).toBe('1.500');
  });

  it('rounds a value where binary floats fail', () => {
    expect(formatDecimal(round(d('1.005'), 2))).toBe('1.01');
  });
});
