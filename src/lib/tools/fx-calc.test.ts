import { describe, expect, it } from 'vitest';
import { calculateFx, type FxOptions, type FxResult } from './fx-calc';

const options: FxOptions = { side: 'buy', rate: '950', spread: '1', fee: '500', decimals: 0 };

function run(input: string, overrides: Partial<FxOptions> = {}): FxResult {
  const result = calculateFx(input, { ...options, ...overrides });
  if ('error' in result) throw new Error(result.error);
  return result;
}

describe('calculateFx', () => {
  it('adds spread and fee when the client buys', () => {
    expect(run('1000')).toEqual({
      rates: {
        mid: '950',
        effective: '959.5',
        inverseMid: '0.00105263',
        inverseEffective: '0.00104221',
      },
      lines: [{ amount: '1000', gross: '959500', fee: '500', total: '960000', spreadCost: '9500' }],
      invalid: [],
    });
  });

  it('subtracts spread and fee when the client sells', () => {
    const { rates, lines } = run('1000', { side: 'sell' });
    expect(rates.effective).toBe('940.5');
    expect(lines[0]).toMatchObject({ gross: '940500', total: '940000', spreadCost: '9500' });
  });

  it('rounds to the quote currency decimals without float noise', () => {
    const { lines } = run('0.07', { rate: '100', spread: '0', fee: '0', decimals: 2 });
    expect(lines[0]?.gross).toBe('7.00');
  });

  it('treats empty spread and fee as zero', () => {
    expect(run('1', { spread: '', fee: '' }).lines[0]?.total).toBe('950');
  });

  it('handles multiple amounts and reports bad lines', () => {
    const { lines, invalid } = run('1\n\nabc\n-5\n2');
    expect(lines).toHaveLength(2);
    expect(invalid).toEqual([
      { line: 3, text: 'abc' },
      { line: 4, text: '-5' },
    ]);
  });

  it.each([
    [{ rate: '' }, 'rate'],
    [{ rate: '0' }, 'rate'],
    [{ rate: '-1' }, 'rate'],
    [{ spread: 'x' }, 'spread'],
    [{ spread: '-1' }, 'spread'],
    [{ side: 'sell', spread: '100' }, 'spread'],
    [{ fee: 'x' }, 'fee'],
  ] as const)('rejects %j', (overrides, error) => {
    expect(calculateFx('1', { ...options, ...overrides })).toEqual({ error });
  });
});
