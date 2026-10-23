import { describe, expect, it } from 'vitest';
import { buildCsvInsert, quoteIdentifier, sqlCell, type CsvInsertOptions } from './csv-insert';

const csv = "id,name,active\n1,Ana,true\n2,O'Brien,\n3,007,null";

describe('buildCsvInsert', () => {
  it('builds one multi-row INSERT by default', () => {
    expect(buildCsvInsert(csv, { table: 'users' })).toEqual({
      output: [
        'INSERT INTO users (id, name, active) VALUES',
        "  (1, 'Ana', TRUE),",
        "  (2, 'O''Brien', NULL),",
        "  (3, '007', NULL);",
      ].join('\n'),
      error: null,
      rows: 3,
    });
  });

  it('builds one INSERT per row', () => {
    const result = buildCsvInsert('a,b\n1,x\n2,y', { table: 't', mode: 'single' });
    expect(result.output).toBe(
      "INSERT INTO t (a, b) VALUES (1, 'x');\nINSERT INTO t (a, b) VALUES (2, 'y');",
    );
  });

  it('splits rows into batches', () => {
    const result = buildCsvInsert('a\n1\n2\n3', { table: 't', batchSize: 2 });
    expect(result.output).toBe(
      'INSERT INTO t (a) VALUES\n  (1),\n  (2);\n\nINSERT INTO t (a) VALUES\n  (3);',
    );
  });

  it('quotes everything without inference and keeps empty strings', () => {
    const result = buildCsvInsert('a,b\n1,', {
      table: 't',
      infer: false,
      nullEmpty: false,
      quote: 'double',
      uppercase: false,
    });
    expect(result.output).toBe('insert into t (a, b) values\n  ("1", "");');
  });

  it('omits the column list without a header', () => {
    expect(buildCsvInsert('1;2', { table: 'public.t', header: false }).output).toBe(
      'INSERT INTO public.t VALUES\n  (1, 2);',
    );
  });

  it('quotes column names that need it', () => {
    const result = buildCsvInsert('first name,id\nA,1', { table: 't', identifiers: 'auto' });
    expect(result.output).toContain('("first name", id)');
    const ticks = buildCsvInsert('first name,id\nA,1', { table: 't', identifiers: 'backtick' });
    expect(ticks.output).toContain('(`first name`, `id`)');
  });

  it('pads short rows and reports them', () => {
    const result = buildCsvInsert('a,b\n1\n2,3,4', { table: 't' });
    expect(result.output).toBe('INSERT INTO t (a, b) VALUES\n  (1, NULL),\n  (2, 3);');
    expect(result.error).toEqual({ code: 'raggedRows', rows: [2, 3] });
  });

  it('requires a valid table name', () => {
    expect(buildCsvInsert('a\n1').error).toEqual({ code: 'tableRequired' });
    expect(buildCsvInsert('a\n1', { table: 'bad name' }).error).toEqual({
      code: 'invalidTable',
      table: 'bad name',
    });
  });

  it('reports CSV errors', () => {
    expect(buildCsvInsert('"a', { table: 't' }).error).toEqual({
      code: 'csv',
      error: { code: 'unterminatedQuote', line: 1 },
    });
  });

  it('returns nothing for blank input', () => {
    expect(buildCsvInsert('', { table: 't' })).toEqual({ output: '', error: null, rows: 0 });
  });
});

describe('quoteIdentifier', () => {
  it.each([
    ['id', 'auto', 'id'],
    ['first name', 'auto', '"first name"'],
    ['a"b', 'double', '"a""b"'],
    ['a`b', 'backtick', '`a``b`'],
    ['x y', 'none', 'x y'],
  ] as const)('quotes %s with %s', (name, style, expected) => {
    expect(quoteIdentifier(name, style)).toBe(expected);
  });
});

describe('sqlCell', () => {
  const options: CsvInsertOptions = {
    table: 't',
    delimiter: 'auto',
    header: true,
    mode: 'multi',
    batchSize: 0,
    quote: 'single',
    escape: true,
    identifiers: 'auto',
    nullEmpty: true,
    infer: true,
    uppercase: true,
  };

  it.each([
    ['1.50', '1.50'],
    ['-3', '-3'],
    ['FALSE', 'FALSE'],
    ['', 'NULL'],
    [undefined, 'NULL'],
    ['x', "'x'"],
  ])('renders %j', (raw, expected) => {
    expect(sqlCell(raw, options)).toBe(expected);
  });
});
