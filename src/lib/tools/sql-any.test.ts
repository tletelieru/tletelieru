import { describe, expect, it } from 'vitest';
import { buildSqlAny, isAnyValue } from './sql-any';

describe('buildSqlAny', () => {
  it('builds a text ARRAY with escaped values', () => {
    expect(buildSqlAny("a\nb\nO'x\na", { column: 'code' })).toEqual({
      output: "code = ANY(ARRAY['a', 'b', 'O''x'])",
      error: null,
      stats: { total: 4, unique: 3, duplicatesRemoved: 1 },
    });
  });

  it('builds integer arrays and skips invalid values', () => {
    expect(buildSqlAny('1, 02, x, 1.5', { column: 'id', type: 'int' })).toMatchObject({
      output: 'id = ANY(ARRAY[1, 2])',
      error: { code: 'invalidValues', type: 'int', values: ['x', '1.5'] },
    });
  });

  it('rejects integers outside the int range', () => {
    expect(isAnyValue('2147483647', 'int')).toBe(true);
    expect(isAnyValue('2147483648', 'int')).toBe(false);
    expect(isAnyValue('2147483648', 'bigint')).toBe(true);
    expect(isAnyValue('9223372036854775808', 'bigint')).toBe(false);
  });

  it('casts bigint and uuid arrays', () => {
    expect(buildSqlAny('1\n2', { column: 'id', type: 'bigint' }).output).toBe(
      'id = ANY(ARRAY[1, 2]::bigint[])',
    );
    expect(
      buildSqlAny('0F8FAD5B-D9CB-469F-A165-70867728950E', { column: 'id', type: 'uuid' }).output,
    ).toBe("id = ANY(ARRAY['0f8fad5b-d9cb-469f-a165-70867728950e']::uuid[])");
  });

  it('builds array literals', () => {
    expect(buildSqlAny('a b\nc', { column: 'tag', style: 'literal' }).output).toBe(
      `tag = ANY('{"a b",c}'::text[])`,
    );
    expect(buildSqlAny('1\n2', { column: 'id', style: 'literal', type: 'int' }).output).toBe(
      "id = ANY('{1,2}'::int[])",
    );
  });

  it('uses <> ALL for NOT and joins batches with AND', () => {
    expect(buildSqlAny('a\nb\nc', { column: 'x', not: true, batchSize: 2 }).output).toBe(
      "(x <> ALL(ARRAY['a', 'b']) AND x <> ALL(ARRAY['c']))",
    );
  });

  it('lowercases keywords and supports multi-line layout', () => {
    expect(
      buildSqlAny('1\n2', { column: 'id', type: 'int', uppercase: false, layout: 'multi' }).output,
    ).toBe('id = any(array[\n  1,\n  2\n])');
  });

  it('validates the column name', () => {
    expect(buildSqlAny('a', { column: 'bad name' }).error).toEqual({
      code: 'invalidColumn',
      column: 'bad name',
    });
  });

  it('returns empty output for empty input', () => {
    expect(buildSqlAny('')).toMatchObject({ output: '', error: null });
  });

  it('reports invalid uuids', () => {
    expect(buildSqlAny('nope', { type: 'uuid' })).toMatchObject({
      output: '',
      error: { code: 'invalidValues', type: 'uuid', values: ['nope'] },
    });
  });
});
