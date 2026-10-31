import { describe, expect, it } from 'vitest';
import { convertMinorUnits, type MinorOptions } from './minor-units';

const usd: MinorOptions = { exponent: 2, direction: 'toMinor', rounding: 'strict' };

describe('convertMinorUnits', () => {
  it.each([
    ['1234.56', 2, '123456'],
    ['19.99', 2, '1999'],
    ['0.07', 2, '7'],
    ['-12.5', 2, '-1250'],
    ['1500', 0, '1500'],
    ['1.234', 3, '1234'],
    ['90071992547409.93', 2, '9007199254740993'],
  ])('amount %s with %i decimals', (input, exponent, expected) => {
    expect(convertMinorUnits(input, { ...usd, exponent }).output).toBe(expected);
  });

  it.each([
    ['123456', 2, '1234.56'],
    ['7', 2, '0.07'],
    ['-5', 3, '-0.005'],
    ['1500', 0, '1500'],
    ['9007199254740993', 2, '90071992547409.93'],
  ])('minor %s with %i decimals', (input, exponent, expected) => {
    expect(convertMinorUnits(input, { ...usd, direction: 'toAmount', exponent }).output).toBe(
      expected,
    );
  });

  it('avoids the float error of 1.15 * 100', () => {
    expect(convertMinorUnits('1.15', usd).output).toBe('115');
  });

  it('rejects excess precision in strict mode', () => {
    expect(convertMinorUnits('1.005', usd).errors).toEqual([
      { line: 1, code: 'precision', text: '1.005' },
    ]);
  });

  it.each([
    ['halfUp', '1.005', '101'],
    ['halfEven', '1.005', '100'],
    ['halfEven', '1.015', '102'],
    ['down', '1.009', '100'],
  ] as const)('rounds %s', (rounding, input, expected) => {
    expect(convertMinorUnits(input, { ...usd, rounding }).output).toBe(expected);
  });

  it('reports invalid and fractional lines with their position', () => {
    const toAmount = { ...usd, direction: 'toAmount' as const };
    expect(convertMinorUnits('1\n\nabc\n1.5', toAmount)).toEqual({
      output: '0.01',
      errors: [
        { line: 3, code: 'invalid', text: 'abc' },
        { line: 4, code: 'fractional', text: '1.5' },
      ],
    });
  });

  it('returns nothing for empty input', () => {
    expect(convertMinorUnits('  \n ', usd)).toEqual({ output: '', errors: [] });
  });
});
