import { describe, expect, it } from 'vitest';
import { computeStats, splitValues, type StatsOptions } from './stats';

const options: StatsOptions = { format: 'auto', decimals: 4 };

describe('computeStats', () => {
  it('computes the textbook data set', () => {
    expect(computeStats('2\n4\n4\n4\n5\n5\n7\n9', options)).toMatchObject({
      count: 8,
      sum: '40',
      mean: '5.0000',
      median: '4.5',
      min: '2',
      max: '9',
      stddevPopulation: '2.0000',
      stddevSample: '2.1381',
    });
  });

  it('sums exactly where floats fail', () => {
    expect(computeStats('0.1\n0.2', options)?.sum).toBe('0.3');
    const many = Array.from({ length: 10 }, () => '0.1').join('\n');
    expect(computeStats(many, options)?.sum).toBe('1');
  });

  it('keeps values beyond 2^53', () => {
    expect(computeStats('9007199254740993\n1', options)?.sum).toBe('9007199254740994');
  });

  it('reads es-CL numbers', () => {
    expect(computeStats('1.234,56\n1.000,44', options)).toMatchObject({
      sum: '2235',
      format: 'comma',
    });
  });

  it('reads en-US numbers', () => {
    expect(computeStats('1,234.56\n1,000.44', options)).toMatchObject({
      sum: '2235',
      format: 'dot',
    });
  });

  it('honors a forced format and flags ambiguity', () => {
    expect(computeStats('1.234', { ...options, format: 'comma' })?.sum).toBe('1234');
    expect(computeStats('1.234', options)).toMatchObject({ sum: '1.234', ambiguous: true });
  });

  it('handles a single value', () => {
    expect(computeStats('5', options)).toMatchObject({
      count: 1,
      stddevSample: null,
      stddevPopulation: '0.0000',
      median: '5',
    });
  });

  it('handles negatives and odd medians', () => {
    expect(computeStats('-3\n1\n2', options)).toMatchObject({ median: '1', min: '-3', sum: '0' });
  });

  it('reports invalid tokens and returns null without numbers', () => {
    expect(computeStats('1\nabc', options)?.invalid).toEqual(['abc']);
    expect(computeStats('abc', options)).toBeNull();
    expect(computeStats('  ', options)).toBeNull();
  });
});

describe('splitValues', () => {
  it('splits on newlines, tabs and semicolons, never on commas', () => {
    expect(splitValues('1,5\n2\t3;4')).toEqual(['1,5', '2', '3', '4']);
  });
});
