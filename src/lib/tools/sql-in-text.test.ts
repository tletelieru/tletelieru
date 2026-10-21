import { describe, expect, it } from 'vitest';
import { buildSqlInText } from './sql-in-text';
import { defaultSqlOptions } from './sql/format';

describe('buildSqlInText', () => {
  it('builds the spec example', () => {
    const input =
      'txn_ab8fcd54-7491-4a31-8066-cf805be27871\ntxn_a34e722a-1c2b-4d3e-9f80-1234567890ab';
    expect(buildSqlInText(input).output).toBe(
      "IN ('txn_ab8fcd54-7491-4a31-8066-cf805be27871', 'txn_a34e722a-1c2b-4d3e-9f80-1234567890ab')",
    );
  });

  it('returns empty output without error for empty input', () => {
    expect(buildSqlInText('  \n ')).toEqual({
      output: '',
      error: null,
      stats: { total: 0, unique: 0, duplicatesRemoved: 0 },
    });
  });

  it('handles a single value', () => {
    expect(buildSqlInText('a').output).toBe("IN ('a')");
  });

  it('escapes embedded quotes', () => {
    expect(buildSqlInText("O'Brien").output).toBe("IN ('O''Brien')");
  });

  it('dedupes, skips blanks and handles CRLF', () => {
    const result = buildSqlInText('a\r\n\r\nb\r\na\r\n');
    expect(result.output).toBe("IN ('a', 'b')");
    expect(result.stats).toEqual({ total: 3, unique: 2, duplicatesRemoved: 1 });
  });

  it('adds the column and NOT IN', () => {
    expect(buildSqlInText('a,b', { column: 'ref', not: true }).output).toBe(
      "ref NOT IN ('a', 'b')",
    );
  });

  it('rejects invalid column names', () => {
    expect(buildSqlInText('a', { column: 'x; drop' })).toMatchObject({
      output: '',
      error: { code: 'invalidColumn', column: 'x; drop' },
    });
  });

  it('supports other quote styles', () => {
    expect(buildSqlInText('a`b', { quote: 'backtick' }).output).toBe('IN (`a``b`)');
    expect(buildSqlInText('a', { quote: 'none' }).output).toBe('IN (a)');
  });

  it('strips existing quotes when requested', () => {
    const parse = { ...defaultSqlOptions.parse, stripQuotes: true };
    expect(buildSqlInText("'O''Brien',\"x\"", { parse }).output).toBe("IN ('O''Brien', 'x')");
  });

  it('batches and joins with OR when a column is given', () => {
    expect(buildSqlInText('a\nb\nc', { column: 'id', batchSize: 2 }).output).toBe(
      "(id IN ('a', 'b') OR id IN ('c'))",
    );
    expect(buildSqlInText('a\nb\nc', { batchSize: 2 }).output).toBe("IN ('a', 'b')\n\nIN ('c')");
  });

  it('formats one per line', () => {
    expect(buildSqlInText('a\nb', { layout: 'multi', uppercase: false }).output).toBe(
      "in (\n  'a',\n  'b'\n)",
    );
  });

  it('keeps unicode values', () => {
    expect(buildSqlInText('ñandú\n日本').output).toBe("IN ('ñandú', '日本')");
  });
});
