import { describe, expect, it } from 'vitest';
import { buildSqlInNumbers, isSqlNumber } from './sql-in-numbers';
import { defaultSqlOptions } from './sql/format';

describe('isSqlNumber', () => {
  it.each(['0', '42', '-7', '3.14', '-0.5', '.5', '0012'])('accepts %s', (value) => {
    expect(isSqlNumber(value)).toBe(true);
  });

  it.each(['abc', '1.2.3', '1e5', '+1', '1,5', '-', '.', '1.', '٣'])('rejects %s', (value) => {
    expect(isSqlNumber(value)).toBe(false);
  });
});

describe('buildSqlInNumbers', () => {
  it('builds an IN list of numbers', () => {
    expect(buildSqlInNumbers('1\n2\n3').output).toBe('IN (1, 2, 3)');
  });

  it('returns empty output without error for empty input', () => {
    expect(buildSqlInNumbers('')).toMatchObject({ output: '', error: null });
  });

  it('flags invalid values instead of emitting them', () => {
    expect(buildSqlInNumbers('1\nabc\n2.5\n-3\n1.2.3')).toMatchObject({
      output: 'IN (1, 2.5, -3)',
      error: { code: 'invalidNumbers', values: ['abc', '1.2.3'] },
    });
  });

  it('reports only an error when nothing is valid', () => {
    expect(buildSqlInNumbers('x')).toMatchObject({
      output: '',
      error: { code: 'invalidNumbers', values: ['x'] },
    });
  });

  it('dedupes numerically and keeps the first spelling', () => {
    const result = buildSqlInNumbers('1\n1.0\n2\n01');
    expect(result.output).toBe('IN (1, 2)');
    expect(result.stats).toEqual({ total: 4, unique: 2, duplicatesRemoved: 2 });
  });

  it('keeps duplicates when dedupe is off', () => {
    const parse = { ...defaultSqlOptions.parse, dedupe: false };
    expect(buildSqlInNumbers('1,1', { parse }).output).toBe('IN (1, 1)');
  });

  it('sorts ascending', () => {
    expect(buildSqlInNumbers('10\n-2\n3.5\n.5', { sort: true }).output).toBe(
      'IN (-2, .5, 3.5, 10)',
    );
  });

  it('accepts CRLF and quoted numbers when stripping quotes', () => {
    const parse = { ...defaultSqlOptions.parse, stripQuotes: true };
    expect(buildSqlInNumbers("'1'\r\n'2'\r\n", { parse }).output).toBe('IN (1, 2)');
  });

  it('applies column, NOT IN, batching and layout', () => {
    expect(
      buildSqlInNumbers('1 2 3'.replace(/ /g, '\n'), { column: 'id', not: true, batchSize: 2 })
        .output,
    ).toBe('(id NOT IN (1, 2) AND id NOT IN (3))');
    expect(buildSqlInNumbers('1\n2', { layout: 'multi' }).output).toBe('IN (\n  1,\n  2\n)');
  });

  it('rejects an invalid column', () => {
    expect(buildSqlInNumbers('1', { column: '1col' }).error).toEqual({
      code: 'invalidColumn',
      column: '1col',
    });
  });
});
