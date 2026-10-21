import { describe, expect, it } from 'vitest';
import { buildSqlLike, escapeLikeWildcards, likePattern } from './sql-like';

describe('likePattern', () => {
  it.each([
    ['contains', '%a%'],
    ['starts', 'a%'],
    ['ends', '%a'],
    ['exact', 'a'],
  ] as const)('builds %s patterns', (match, expected) => {
    expect(likePattern('a', match)).toBe(expected);
  });

  it('escapes wildcards and the escape character with !', () => {
    expect(escapeLikeWildcards('50%_a!b\\c')).toBe('50!%!_a!!b\\c');
    expect(likePattern('a_b', 'starts', true)).toBe('a!_b%');
  });
});

describe('buildSqlLike', () => {
  it('chains conditions with OR in parentheses', () => {
    expect(buildSqlLike('a\nb', { column: 'name' }).output).toBe(
      "(name LIKE '%a%' OR name LIKE '%b%')",
    );
  });

  it('does not wrap a single condition', () => {
    expect(buildSqlLike('a', { column: 'name' }).output).toBe("name LIKE '%a%'");
  });

  it('returns empty output without error for empty input', () => {
    expect(buildSqlLike('', { column: '' })).toMatchObject({ output: '', error: null });
  });

  it('requires a column when there are values', () => {
    expect(buildSqlLike('a')).toMatchObject({ output: '', error: { code: 'columnRequired' } });
  });

  it('supports AND, NOT, ILIKE and lowercase', () => {
    expect(
      buildSqlLike('a,b', {
        column: 'email',
        joiner: 'and',
        not: true,
        ilike: true,
        match: 'ends',
        uppercase: false,
      }).output,
    ).toBe("(email not ilike '%a' and email not ilike '%b')");
  });

  it('escapes quotes inside patterns', () => {
    expect(buildSqlLike("O'Brien", { column: 'last_name', match: 'exact' }).output).toBe(
      "last_name LIKE 'O''Brien'",
    );
  });

  it('adds ESCAPE only where wildcards were escaped', () => {
    expect(buildSqlLike('txn_1\nabc', { column: 'id', escapeWildcards: true }).output).toBe(
      "(id LIKE '%txn!_1%' ESCAPE '!' OR id LIKE '%abc%')",
    );
  });

  it('can skip the parentheses', () => {
    expect(buildSqlLike('a\nb', { column: 'c', wrap: false }).output).toBe(
      "c LIKE '%a%' OR c LIKE '%b%'",
    );
  });

  it('formats one per line', () => {
    expect(buildSqlLike('a\nb', { column: 'c', layout: 'multi' }).output).toBe(
      "(\n  c LIKE '%a%'\n  OR c LIKE '%b%'\n)",
    );
  });

  it('splits into batches separated by blank lines', () => {
    expect(buildSqlLike('a\nb\nc', { column: 'c', batchSize: 2 }).output).toBe(
      "(c LIKE '%a%' OR c LIKE '%b%')\n\nc LIKE '%c%'",
    );
  });

  it('handles CRLF, duplicates and unicode', () => {
    const result = buildSqlLike('ñ\r\nñ\r\n日本', { column: 'c' });
    expect(result.output).toBe("(c LIKE '%ñ%' OR c LIKE '%日本%')");
    expect(result.stats.duplicatesRemoved).toBe(1);
  });
});
