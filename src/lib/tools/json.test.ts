import { describe, expect, it } from 'vitest';
import {
  buildExcerpt,
  formatBytes,
  locate,
  parseJson,
  processJson,
  stringifyJson,
  type JsonErrorDetail,
  type JsonNode,
} from './json';

function format(input: string, options: Parameters<typeof processJson>[1] = {}): string {
  const result = processJson(input, options);
  if (!result.ok) throw new Error(result.error.code);
  return result.output;
}

function errorOf(input: string) {
  const result = parseJson(input);
  if (result.ok) throw new Error('expected an error');
  return result.error;
}

describe('parseJson', () => {
  it.each([
    '{}',
    '[]',
    '0',
    '-0.5e+10',
    '"text"',
    'true',
    'null',
    ' { "a" : [1, 2, {"b": null}] } ',
    '"\\u00e9\\n\\t\\"\\\\\\/"',
    '[[[[]]], [[1]], []]',
  ])('accepts %s', (input) => {
    expect(parseJson(input).ok).toBe(true);
  });

  it.each<[string, number, number, JsonErrorDetail]>([
    ['', 1, 1, { code: 'empty' }],
    ['{"a": 1,}', 1, 8, { code: 'trailing-comma', before: '}' }],
    ['[1, 2,\n]', 1, 6, { code: 'trailing-comma', before: ']' }],
    ["{'a': 1}", 1, 2, { code: 'single-quote-key' }],
    ['["a]', 1, 2, { code: 'unterminated-string' }],
    ['["a\nb"]', 1, 2, { code: 'string-line-break' }],
    ["['a']", 1, 2, { code: 'single-quote-string' }],
    ['{a: 1}', 1, 2, { code: 'unquoted-key', key: 'a' }],
    ['{"a" 1}', 1, 6, { code: 'unexpected-char', char: '1', expected: 'colon' }],
    ['{"a": 1 "b": 2}', 1, 9, { code: 'unexpected-char', char: '"', expected: 'comma-or-brace' }],
    ['[1 2]', 1, 4, { code: 'unexpected-char', char: '2', expected: 'comma-or-bracket' }],
    ['[1, 2', 1, 6, { code: 'unexpected-end', expected: 'comma-or-bracket' }],
    ['{"a": ', 1, 7, { code: 'unexpected-end', expected: 'value' }],
    ['{"a": 01}', 1, 7, { code: 'number-leading-zero' }],
    ['{"a": 1.}', 1, 9, { code: 'number-fraction' }],
    ['{"a": 1e}', 1, 9, { code: 'number-exponent' }],
    ['{"a": -x}', 1, 8, { code: 'number-minus' }],
    ['{"a": +1}', 1, 7, { code: 'number-leading-plus' }],
    ['{"a": .5}', 1, 7, { code: 'number-leading-dot' }],
    ['{"a": NaN}', 1, 7, { code: 'invalid-literal', literal: 'NaN' }],
    ['{"a": tru}', 1, 7, { code: 'unexpected-token', token: 'tru', expected: 'value' }],
    ['[1, ]]', 1, 3, { code: 'trailing-comma', before: ']' }],
    ['{"a": }', 1, 7, { code: 'unexpected-close', char: '}' }],
    ['"\\x"', 1, 2, { code: 'invalid-escape', escape: '\\x' }],
    ['"\\u12G4"', 1, 2, { code: 'invalid-unicode-escape' }],
    ['"a\tb"', 1, 3, { code: 'control-char', char: 'U+0009' }],
    ['{} {}', 1, 4, { code: 'trailing-content' }],
    ['// hi\n{}', 1, 1, { code: 'comment' }],
    ['[1, /* x */ 2]', 1, 5, { code: 'comment' }],
    ['[\u00a0]', 1, 2, { code: 'unexpected-char', char: 'U+00A0', expected: 'value' }],
    ['{\n  "a": 1,\n  "b": [1, 2,]\n}', 3, 13, { code: 'trailing-comma', before: ']' }],
  ])('reports %j at %i:%i', (input, line, column, detail) => {
    const error = errorOf(input);
    expect(error).toMatchObject({ ...detail, line, column });
  });

  it('counts CRLF as a single line break', () => {
    const error = errorOf('{\r\n  "a": 1,\r\n  "b": x\r\n}');
    expect(error).toMatchObject({ line: 3, column: 8 });
  });

  it('tolerates a leading BOM', () => {
    expect(parseJson('\uFEFF{"a": 1}').ok).toBe(true);
    expect(errorOf('\uFEFF{"a": }')).toMatchObject({ line: 1, column: 7 });
  });

  it('reports depth and key count', () => {
    const result = parseJson('{"a": {"b": [1, {"c": 2}]}, "d": []}');
    expect(result.ok && result.stats).toEqual({ depth: 4, keys: 4 });
  });

  it('handles very deep nesting without recursion', () => {
    const depth = 50_000;
    const input = '['.repeat(depth) + ']'.repeat(depth);
    const result = parseJson(input);
    expect(result.ok && result.stats.depth).toBe(depth);
    expect(format(input, { mode: 'minify' })).toBe(input);
  });
});

describe('error excerpt', () => {
  it('points a caret at the problem', () => {
    const error = errorOf('{\n  "a": 1,\n}');
    expect(error.excerpt).toBe('2 |   "a": 1,\n  |         ^');
  });

  it('windows long lines', () => {
    const line = `[${'1,'.repeat(100)}x]`;
    const excerpt = buildExcerpt(line, line.indexOf('x'), 20);
    const [source, pointer] = excerpt.split('\n');
    expect(source).toContain('…');
    expect(pointer?.indexOf('^')).toBe(source?.indexOf('x'));
  });

  it('locates offsets counting code points', () => {
    expect(locate('"😀" x', 5)).toEqual({ line: 1, column: 5 });
  });
});

describe('processJson', () => {
  const sample = '{"b":[1,2,{"z":true,"a":null}],"a":"x","e":{}, "f": []}';

  it('formats with 2 spaces by default', () => {
    expect(format('{"a":[1,{"b":2}],"c":{}}')).toBe(
      '{\n  "a": [\n    1,\n    {\n      "b": 2\n    }\n  ],\n  "c": {}\n}',
    );
  });

  it('formats with 4 spaces and tabs', () => {
    expect(format('{"a":[1]}', { indent: '4' })).toBe('{\n    "a": [\n        1\n    ]\n}');
    expect(format('{"a":[1]}', { indent: 'tab' })).toBe('{\n\t"a": [\n\t\t1\n\t]\n}');
  });

  it('matches JSON.stringify output for plain values', () => {
    const value = JSON.parse(sample) as unknown;
    expect(format(sample)).toBe(JSON.stringify(value, null, 2));
    expect(format(sample, { mode: 'minify' })).toBe(JSON.stringify(value));
  });

  it('minifies', () => {
    expect(format(' {\r\n "a" : [ 1 , 2 ] ,\n "b" : { } } ', { mode: 'minify' })).toBe(
      '{"a":[1,2],"b":{}}',
    );
  });

  it('sorts keys recursively and keeps array order', () => {
    expect(format(sample, { mode: 'minify', sortKeys: true })).toBe(
      '{"a":"x","b":[1,2,{"a":null,"z":true}],"e":{},"f":[]}',
    );
  });

  it('sorts by decoded key and keeps duplicates stable', () => {
    expect(format('{"\\u0062":1,"a":2,"a":3}', { mode: 'minify', sortKeys: true })).toBe(
      '{"a":2,"a":3,"\\u0062":1}',
    );
  });

  it('preserves number precision and string escapes', () => {
    const input = '[12345678901234567890, 1.0, 1e400, -0, 0.10, "\\u00e9\\ud83d\\ude00"]';
    expect(format(input, { mode: 'minify' })).toBe(
      '[12345678901234567890,1.0,1e400,-0,0.10,"\\u00e9\\ud83d\\ude00"]',
    );
  });

  it('keeps unicode characters untouched', () => {
    expect(format('{"ñ": "日本語 😀"}', { mode: 'minify' })).toBe('{"ñ":"日本語 😀"}');
  });

  it('strips the BOM from the output', () => {
    expect(format('\uFEFF[1]', { mode: 'minify' })).toBe('[1]');
  });

  it('reports sizes in validate mode without output', () => {
    const result = processJson('{"a": "é"}', { mode: 'validate' });
    expect(result).toEqual({
      ok: true,
      output: '',
      stats: { depth: 1, keys: 1, inputBytes: 11, outputBytes: 11 },
    });
  });

  it('reports sizes before and after', () => {
    const result = processJson('{ "a" : 1 }', { mode: 'minify' });
    expect(result.ok && result.stats).toMatchObject({ inputBytes: 11, outputBytes: 7 });
  });

  it('returns the error for invalid input', () => {
    const result = processJson('{"a": 1,}');
    expect(result.ok).toBe(false);
  });
});

describe('stringifyJson', () => {
  it('formats a scalar root', () => {
    const node: JsonNode = { type: 'number', raw: '1.50' };
    expect(stringifyJson(node)).toBe('1.50');
  });
});

describe('formatBytes', () => {
  it.each([
    [512, '512 B'],
    [2048, '2.0 KB'],
    [3 * 1024 * 1024, '3.00 MB'],
  ])('formats %i', (bytes, text) => {
    expect(formatBytes(bytes)).toBe(text);
  });
});
