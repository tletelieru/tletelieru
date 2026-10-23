import { describe, expect, it } from 'vitest';
import { formatSql, minifySql, parseFormatError } from './sql-format';

const query = "select id, name from users where status = 'active' and id in (1,2) order by id";

describe('formatSql', () => {
  it('formats with uppercase keywords and 2 spaces by default', () => {
    expect(formatSql(query)).toEqual({
      ok: true,
      output:
        "SELECT\n  id,\n  name\nFROM\n  users\nWHERE\n  status = 'active'\n  AND id IN (1, 2)\nORDER BY\n  id",
    });
  });

  it('lowercases keywords and indents with 4 spaces', () => {
    const result = formatSql('SELECT a FROM t', { keywordCase: 'lower', indent: '4' });
    expect(result).toEqual({ ok: true, output: 'select\n    a\nfrom\n    t' });
  });

  it('preserves keyword case', () => {
    expect(formatSql('Select a From t', { keywordCase: 'preserve' })).toEqual({
      ok: true,
      output: 'Select\n  a\nFrom\n  t',
    });
  });

  it('indents with tabs', () => {
    expect(formatSql('select a from t', { indent: 'tab' })).toEqual({
      ok: true,
      output: 'SELECT\n\ta\nFROM\n\tt',
    });
  });

  it('understands Postgres operators and dollar quotes', () => {
    const result = formatSql("select data->>'k', $$a  b$$ from t", {
      dialect: 'postgresql',
      minify: true,
    });
    expect(result).toEqual({ ok: true, output: "SELECT data ->> 'k', $$a  b$$ FROM t" });
  });

  it('understands MySQL backticks', () => {
    expect(formatSql('select `order` from `t`', { dialect: 'mysql', minify: true })).toEqual({
      ok: true,
      output: 'SELECT `order` FROM `t`',
    });
  });

  it('minifies to one line and drops comments', () => {
    expect(formatSql('select a, b -- note\nfrom t /* x */ where c = 1', { minify: true })).toEqual({
      ok: true,
      output: 'SELECT a, b FROM t WHERE c = 1',
    });
  });

  it('returns empty output for blank input', () => {
    expect(formatSql('  \n')).toEqual({ ok: true, output: '' });
  });

  it('reports parse errors with a position', () => {
    expect(formatSql('select (a from')).toEqual({
      ok: false,
      error: { code: 'parse', line: 1, column: 15 },
    });
  });
});

describe('minifySql', () => {
  it('keeps whitespace inside strings and quoted identifiers', () => {
    expect(minifySql('select   \'a   b\',\n  "x  y"\nfrom t')).toBe(
      `select 'a   b', "x  y" from t`,
    );
  });

  it('keeps escaped quotes inside strings', () => {
    expect(minifySql("select 'it''s  ok'")).toBe("select 'it''s  ok'");
  });

  it('removes spaces inside parentheses and before commas', () => {
    expect(minifySql('count( * ) , max( a )')).toBe('count(*), max(a)');
  });

  it('handles unterminated block comments', () => {
    expect(minifySql('select 1 /* open')).toBe('select 1');
  });
});

describe('parseFormatError', () => {
  it('falls back to no position', () => {
    expect(parseFormatError(new Error('boom'))).toEqual({
      code: 'parse',
      line: null,
      column: null,
    });
  });
});
