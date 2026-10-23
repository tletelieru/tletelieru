import { describe, expect, it } from 'vitest';
import {
  cellKind,
  convertCsvJson,
  csvToJson,
  detectDelimiter,
  inferCell,
  jsonToCsv,
  parseCsv,
  quoteCsvField,
  readCsvTable,
  uniqueHeader,
} from './csv';

describe('parseCsv', () => {
  it('splits simple rows', () => {
    expect(parseCsv('a,b\n1,2')).toEqual({
      ok: true,
      rows: [
        ['a', 'b'],
        ['1', '2'],
      ],
    });
  });

  it('handles quoted fields, escaped quotes and delimiters inside quotes', () => {
    expect(parseCsv('"a, b","say ""hi""",c')).toEqual({
      ok: true,
      rows: [['a, b', 'say "hi"', 'c']],
    });
  });

  it('keeps newlines inside quoted fields', () => {
    expect(parseCsv('"line 1\nline 2",x\r\ny,z')).toEqual({
      ok: true,
      rows: [
        ['line 1\nline 2', 'x'],
        ['y', 'z'],
      ],
    });
  });

  it('accepts CRLF, CR and a trailing newline', () => {
    expect(parseCsv('a\r\nb\rc\n')).toEqual({ ok: true, rows: [['a'], ['b'], ['c']] });
  });

  it('keeps empty fields and skips blank lines', () => {
    expect(parseCsv('a,,c\n\n,b,')).toEqual({
      ok: true,
      rows: [
        ['a', '', 'c'],
        ['', 'b', ''],
      ],
    });
  });

  it('parses an empty quoted field', () => {
    expect(parseCsv('"",a')).toEqual({ ok: true, rows: [['', 'a']] });
  });

  it('treats quotes inside unquoted fields literally', () => {
    expect(parseCsv('5" screen,x')).toEqual({ ok: true, rows: [['5" screen', 'x']] });
  });

  it('strips a BOM', () => {
    expect(parseCsv('﻿a,b')).toEqual({ ok: true, rows: [['a', 'b']] });
  });

  it('reports an unterminated quote with its line', () => {
    expect(parseCsv('a\n"b\nc')).toEqual({
      ok: false,
      error: { code: 'unterminatedQuote', line: 2 },
    });
  });

  it('reports text after a closing quote', () => {
    expect(parseCsv('a\n"b"x')).toEqual({
      ok: false,
      error: { code: 'textAfterQuote', line: 2, column: 4 },
    });
  });

  it('uses a custom delimiter', () => {
    expect(parseCsv('a;b\t c', ';')).toEqual({ ok: true, rows: [['a', 'b\t c']] });
  });
});

describe('detectDelimiter', () => {
  it.each([
    ['a,b,c', ','],
    ['a;b;c', ';'],
    ['a\tb\tc', '\t'],
    ['"a;b",c', ','],
    ['single', ','],
  ])('detects %j', (input, expected) => {
    expect(detectDelimiter(input)).toBe(expected);
  });
});

describe('uniqueHeader', () => {
  it('fills blanks and suffixes duplicates', () => {
    expect(uniqueHeader(['id', '', 'id', ' name '])).toEqual(['id', 'column_2', 'id_2', 'name']);
  });
});

describe('readCsvTable', () => {
  it('separates the header', () => {
    expect(readCsvTable('a;b\n1;2')).toEqual({
      ok: true,
      table: { header: ['a', 'b'], rows: [['1', '2']], delimiter: ';' },
    });
  });
});

describe('cellKind and inferCell', () => {
  it.each([
    ['42', 42],
    ['-1.5', -1.5],
    ['1e3', 1000],
    ['007', '007'],
    ['12345678901234567890', '12345678901234567890'],
    ['TRUE', true],
    ['false', false],
    ['null', null],
    ['', ''],
    ['abc', 'abc'],
  ])('infers %j', (raw, expected) => {
    expect(inferCell(raw)).toBe(expected);
  });

  it('classifies kinds', () => {
    expect(cellKind('1.0')).toBe('number');
    expect(cellKind('+1')).toBe('string');
  });
});

describe('csvToJson', () => {
  it('builds objects with inferred types', () => {
    expect(csvToJson('id,name,active\n1,Ana,true\n2,,null', { pretty: false })).toEqual({
      ok: true,
      output: '[{"id":1,"name":"Ana","active":true},{"id":2,"name":"","active":null}]',
      stats: { rows: 2, columns: 3 },
    });
  });

  it('keeps strings without inference', () => {
    const result = csvToJson('id\n1', { infer: false, pretty: false });
    expect(result).toMatchObject({ ok: true, output: '[{"id":"1"}]' });
  });

  it('returns arrays without a header', () => {
    const result = csvToJson('a,b\n1,2', { header: false, pretty: false });
    expect(result).toMatchObject({ ok: true, output: '[["a","b"],[1,2]]' });
  });

  it('pads short rows and names extra columns', () => {
    const result = csvToJson('a,b\n1\n1,2,3', { pretty: false });
    expect(result).toMatchObject({
      ok: true,
      output: '[{"a":1,"b":null,"column_3":null},{"a":1,"b":2,"column_3":3}]',
    });
  });

  it('pretty prints with 2 spaces', () => {
    expect(csvToJson('a\n1')).toMatchObject({ output: '[\n  {\n    "a": 1\n  }\n]' });
  });

  it('reports CSV errors', () => {
    expect(csvToJson('"a')).toEqual({
      ok: false,
      error: { code: 'csv', error: { code: 'unterminatedQuote', line: 1 } },
    });
  });

  it('returns nothing for blank input', () => {
    expect(csvToJson(' ')).toEqual({ ok: true, output: '', stats: { rows: 0, columns: 0 } });
  });
});

describe('quoteCsvField', () => {
  it.each([
    ['plain', 'plain'],
    ['a,b', '"a,b"'],
    ['say "hi"', '"say ""hi"""'],
    ['two\nlines', '"two\nlines"'],
    [' padded', '" padded"'],
  ])('quotes %j', (text, expected) => {
    expect(quoteCsvField(text, ',')).toBe(expected);
  });
});

describe('jsonToCsv', () => {
  it('unions keys across objects and quotes when needed', () => {
    expect(jsonToCsv('[{"a":1,"b":"x,y"},{"a":2,"c":{"d":1}}]')).toEqual({
      ok: true,
      output: 'a,b,c\n1,"x,y",\n2,,"{""d"":1}"',
      stats: { rows: 2, columns: 3 },
    });
  });

  it('accepts a single object and arrays of arrays', () => {
    expect(jsonToCsv('{"a":null,"b":true}')).toMatchObject({ output: 'a,b\n,true' });
    expect(jsonToCsv('[[1,"a;b"],[2]]', { delimiter: 'semicolon' })).toMatchObject({
      output: '1;"a;b"\n2',
    });
  });

  it('omits the header row when disabled', () => {
    expect(jsonToCsv('[{"a":1}]', { header: false })).toMatchObject({ output: '1' });
  });

  it('rejects non-tabular JSON', () => {
    expect(jsonToCsv('[1, 2]')).toEqual({ ok: false, error: { code: 'notTabular' } });
  });

  it('reports invalid JSON with a position', () => {
    expect(jsonToCsv('[1,]')).toMatchObject({
      ok: false,
      error: { code: 'json', error: { code: 'trailing-comma', line: 1, column: 3 } },
    });
  });

  it('round-trips through convertCsvJson', () => {
    const csv = 'id,note\n1,"a ""b"", c"\n2,"x\ny"';
    const json = convertCsvJson(csv, 'csv2json', { infer: false });
    expect(json.ok && convertCsvJson(json.output, 'json2csv')).toMatchObject({ output: csv });
  });
});
