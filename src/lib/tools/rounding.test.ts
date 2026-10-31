import { describe, expect, it } from 'vitest';
import { compareRounding } from './rounding';

describe('compareRounding', () => {
  it('shows every mode side by side', () => {
    expect(compareRounding('2.5', 0).rows[0]).toEqual({
      value: '2.5',
      results: {
        halfUp: '3',
        halfDown: '2',
        halfEven: '2',
        up: '3',
        down: '2',
        ceiling: '3',
        floor: '2',
      },
    });
  });

  it('separates up/down from ceiling/floor on negatives', () => {
    expect(compareRounding('-2.5', 0).rows[0]?.results).toEqual({
      halfUp: '-3',
      halfDown: '-2',
      halfEven: '-2',
      up: '-3',
      down: '-2',
      ceiling: '-2',
      floor: '-3',
    });
  });

  it('works at N decimals on values that break binary floats', () => {
    expect(compareRounding('1.005', 2).rows[0]?.results.halfUp).toBe('1.01');
    expect(compareRounding('2.675', 2).rows[0]?.results.halfEven).toBe('2.68');
    expect(compareRounding('2.665', 2).rows[0]?.results.halfEven).toBe('2.66');
  });

  it('pads shorter values', () => {
    expect(compareRounding('1.5', 3).rows[0]?.results.down).toBe('1.500');
  });

  it('reports invalid lines', () => {
    expect(compareRounding('1\n\nabc', 0)).toMatchObject({
      rows: [{ value: '1' }],
      invalid: [{ line: 3, text: 'abc' }],
    });
  });
});
