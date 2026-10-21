import { describe, expect, it } from 'vitest';
import {
  buildSqlJson,
  jsonDocument,
  mysqlPath,
  parseKeyPath,
  resolveOperation,
  sqlLiteral,
} from './sql-json';

describe('parseKeyPath', () => {
  it('splits dot notation', () => {
    expect(parseKeyPath('reference')).toEqual(['reference']);
    expect(parseKeyPath(' nested.key ')).toEqual(['nested', 'key']);
    expect(parseKeyPath('user-id.año')).toEqual(['user-id', 'año']);
  });

  it.each(['', 'a..b', '.a', 'a.', "a'b", 'a b', 'a"b'])('rejects %s', (path) => {
    expect(parseKeyPath(path)).toBeNull();
  });
});

describe('helpers', () => {
  it('escapes SQL literals per dialect', () => {
    expect(sqlLiteral("O'Brien", 'postgres')).toBe("'O''Brien'");
    expect(sqlLiteral('a\\b', 'postgres')).toBe("'a\\b'");
    expect(sqlLiteral('a\\b', 'mysql')).toBe("'a\\\\b'");
  });

  it('builds nested JSON documents', () => {
    expect(jsonDocument(['nested', 'key'], 'say "hi"')).toBe('{"nested": {"key": "say \\"hi\\""}}');
  });

  it('quotes non-bare MySQL path keys', () => {
    expect(mysqlPath(['a', 'user-id'])).toBe('$.a."user-id"');
  });

  it('falls back to the first operation of the dialect', () => {
    expect(resolveOperation('postgres', 'extract')).toBe('arrow');
    expect(resolveOperation('mysql', 'path')).toBe('extract');
    expect(resolveOperation('mysql', 'contains')).toBe('contains');
  });
});

describe('buildSqlJson postgres', () => {
  it('builds ->> IN', () => {
    expect(buildSqlJson('a\nb').output).toBe("meta_data->>'reference' IN ('a', 'b')");
  });

  it('uses = for a single value on nested paths', () => {
    expect(buildSqlJson('x', { path: 'nested.key' }).output).toBe(
      "meta_data->'nested'->>'key' = 'x'",
    );
  });

  it('builds #>> paths', () => {
    expect(buildSqlJson('x', { path: 'nested.key', operation: 'path' }).output).toBe(
      "meta_data #>> '{nested,key}' = 'x'",
    );
  });

  it('builds containment joined with OR', () => {
    expect(buildSqlJson('a\nb', { operation: 'contains' }).output).toBe(
      `(meta_data @> '{"reference": "a"}' OR meta_data @> '{"reference": "b"}')`,
    );
  });

  it('escapes quotes for JSON inside SQL literals', () => {
    expect(buildSqlJson(`O'Brien "x"`, { operation: 'contains', path: 'a.b' }).output).toBe(
      `meta_data @> '{"a": {"b": "O''Brien \\"x\\""}}'`,
    );
  });

  it('batches IN lists', () => {
    expect(buildSqlJson('a\nb\nc', { batchSize: 2 }).output).toBe(
      "(meta_data->>'reference' IN ('a', 'b') OR meta_data->>'reference' IN ('c'))",
    );
  });
});

describe('buildSqlJson mysql', () => {
  it('builds JSON_EXTRACT IN', () => {
    expect(buildSqlJson('a\nb', { dialect: 'mysql', operation: 'extract' }).output).toBe(
      "JSON_UNQUOTE(JSON_EXTRACT(meta_data, '$.reference')) IN ('a', 'b')",
    );
  });

  it('builds ->> equality', () => {
    expect(buildSqlJson('a', { dialect: 'mysql', operation: 'arrow' }).output).toBe(
      "meta_data->>'$.reference' = 'a'",
    );
  });

  it('builds JSON_CONTAINS joined with OR', () => {
    expect(buildSqlJson('a\nb', { dialect: 'mysql', operation: 'contains' }).output).toBe(
      `(JSON_CONTAINS(meta_data, '"a"', '$.reference') OR JSON_CONTAINS(meta_data, '"b"', '$.reference'))`,
    );
  });

  it('escapes backslashes and quotes in JSON documents', () => {
    expect(
      buildSqlJson(`it's "q"`, { dialect: 'mysql', operation: 'contains', uppercase: false })
        .output,
    ).toBe(`json_contains(meta_data, '"it''s \\\\"q\\\\""', '$.reference')`);
  });

  it('falls back to JSON_EXTRACT for an unsupported operation', () => {
    expect(buildSqlJson('a', { dialect: 'mysql', operation: 'path' }).output).toBe(
      "JSON_UNQUOTE(JSON_EXTRACT(meta_data, '$.reference')) = 'a'",
    );
  });
});

describe('buildSqlJson validation', () => {
  it('returns empty output without error for empty input', () => {
    expect(buildSqlJson('', { column: '' })).toMatchObject({ output: '', error: null });
  });

  it('validates column and path', () => {
    expect(buildSqlJson('a', { column: '' }).error).toEqual({ code: 'columnRequired' });
    expect(buildSqlJson('a', { column: 'meta data' }).error).toEqual({
      code: 'invalidColumn',
      column: 'meta data',
    });
    expect(buildSqlJson('a', { path: ' ' }).error).toEqual({ code: 'pathRequired' });
    expect(buildSqlJson('a', { path: "x'y" }).error).toEqual({ code: 'invalidPath', path: "x'y" });
  });
});
