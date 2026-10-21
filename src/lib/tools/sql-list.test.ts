import { describe, expect, it } from 'vitest';
import { buildSqlList, pgArrayElement, pgArrayLiteral } from './sql-list';

describe('pgArrayElement', () => {
  it.each([
    ['abc', 'abc'],
    ['a b', '"a b"'],
    ['a,b', '"a,b"'],
    ['say "hi"', '"say \\"hi\\""'],
    ['a\\b', '"a\\\\b"'],
    ['{x}', '"{x}"'],
    ['null', '"null"'],
    ['ñ', 'ñ'],
  ])('encodes %s', (value, expected) => {
    expect(pgArrayElement(value)).toBe(expected);
  });

  it('builds a quoted literal', () => {
    expect(pgArrayLiteral(['a', "O'Brien"])).toBe("'{a,O''Brien}'");
  });
});

describe('buildSqlList', () => {
  it('wraps in parentheses by default', () => {
    expect(buildSqlList('a\nb').output).toBe("('a', 'b')");
  });

  it('returns empty output without error for empty input', () => {
    expect(buildSqlList('')).toMatchObject({ output: '', error: null });
  });

  it.each([
    ['plain', "'a', 'b'"],
    ['array', "ARRAY['a', 'b']"],
    ['any', "= ANY(ARRAY['a', 'b'])"],
    ['literal', "'{a,b}'"],
    ['values', "VALUES ('a'), ('b')"],
  ] as const)('formats %s', (wrapper, expected) => {
    expect(buildSqlList('a\nb', { wrapper }).output).toBe(expected);
  });

  it.each([
    ['plain', "'a',\n'b'"],
    ['parens', "(\n  'a',\n  'b'\n)"],
    ['array', "ARRAY[\n  'a',\n  'b'\n]"],
    ['values', "VALUES\n  ('a'),\n  ('b')"],
  ] as const)('formats %s one per line', (wrapper, expected) => {
    expect(buildSqlList('a\nb', { wrapper, layout: 'multi' }).output).toBe(expected);
  });

  it('prefixes the column for ANY and joins batches with OR', () => {
    expect(buildSqlList('1\n2\n3', { wrapper: 'any', column: 'id', batchSize: 2 }).output).toBe(
      "(id = ANY(ARRAY['1', '2']) OR id = ANY(ARRAY['3']))",
    );
  });

  it('rejects an invalid column for ANY only', () => {
    expect(buildSqlList('a', { wrapper: 'any', column: 'a b' }).error).toEqual({
      code: 'invalidColumn',
      column: 'a b',
    });
    expect(buildSqlList('a', { wrapper: 'parens', column: 'a b' }).error).toBeNull();
  });

  it('separates batches by blank lines', () => {
    expect(buildSqlList('a\nb\nc', { batchSize: 2 }).output).toBe("('a', 'b')\n\n('c')");
  });

  it('applies quote style, escaping and lowercase keywords', () => {
    expect(buildSqlList("O'Brien", { wrapper: 'array', uppercase: false }).output).toBe(
      "array['O''Brien']",
    );
    expect(buildSqlList('a"b', { quote: 'double' }).output).toBe('("a""b")');
    expect(buildSqlList('1\n2', { quote: 'none', wrapper: 'plain' }).output).toBe('1, 2');
  });

  it('escapes array literal elements', () => {
    expect(buildSqlList('a b\nO\'Brien\n"x"', { wrapper: 'literal' }).output).toBe(
      `'{"a b",O''Brien,"\\"x\\""}'`,
    );
  });

  it('handles CRLF, duplicates and a single value', () => {
    const result = buildSqlList('a\r\na\r\n');
    expect(result.output).toBe("('a')");
    expect(result.stats).toEqual({ total: 2, unique: 1, duplicatesRemoved: 1 });
  });
});
