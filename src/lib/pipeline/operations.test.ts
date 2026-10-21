import { describe, expect, it } from 'vitest';
import { getOperation, pipelineOperations } from './operations';
import { resolveOptions } from './options';
import { operationGroups, type StepResult } from './types';

function run(id: string, input: string, options: Record<string, string> = {}): StepResult {
  const operation = getOperation(id);
  if (!operation) throw new Error(`missing ${id}`);
  return operation.run(input, resolveOptions(operation.options, options));
}

function output(id: string, input: string, options: Record<string, string> = {}): string {
  const result = run(id, input, options);
  if (!result.ok) throw new Error(`${id} failed: ${result.error.code}`);
  return result.output;
}

describe('pipeline operations registry', () => {
  it('has unique ids, known groups and valid enum defaults', () => {
    const ids = pipelineOperations.map((operation) => operation.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const operation of pipelineOperations) {
      expect(operationGroups).toContain(operation.group);
      const keys = operation.options.map((spec) => spec.key);
      expect(new Set(keys).size).toBe(keys.length);
      for (const spec of operation.options) {
        if (spec.kind === 'enum') expect(spec.values).toContain(spec.default);
      }
    }
  });

  it('returns undefined for unknown ids', () => {
    expect(getOperation('nope')).toBeUndefined();
  });
});

describe('line operations', () => {
  it('trims, removes blanks, dedupes and reverses', () => {
    expect(output('trim-lines', '  a \r\n b')).toBe('a\nb');
    expect(output('remove-blank', 'a\n\n  \nb\n')).toBe('a\nb');
    expect(output('dedupe', 'a\nb\na\nA')).toBe('a\nb\nA');
    expect(output('dedupe', 'a\nb\nA', { case: 'insensitive' })).toBe('a\nb');
    expect(output('reverse', '1\n2\n3')).toBe('3\n2\n1');
  });

  it('sorts naturally in both directions', () => {
    expect(output('sort', 'item10\nitem2\nItem1\nbeta')).toBe('beta\nItem1\nitem2\nitem10');
    expect(output('sort', 'a2\na10\na1', { order: 'desc' })).toBe('a10\na2\na1');
  });

  it('adds prefix and suffix', () => {
    expect(output('affix', 'a\nb', { prefix: '- ', suffix: ';' })).toBe('- a;\n- b;');
  });

  it('joins and splits with escaped separators', () => {
    expect(output('join', 'a\nb\nc')).toBe('a, b, c');
    expect(output('join', 'a\nb', { sep: '\\t' })).toBe('a\tb');
    expect(output('split', 'a,b,c')).toBe('a\nb\nc');
    expect(output('split', 'a|b', { sep: '|' })).toBe('a\nb');
    expect(output('split', 'abc', { sep: '' })).toBe('abc');
  });
});

describe('text operations', () => {
  it('changes case, trims and replaces literally', () => {
    expect(output('upper', 'ñandú')).toBe('ÑANDÚ');
    expect(output('lower', 'ABC')).toBe('abc');
    expect(output('trim', '  x \n')).toBe('x');
    expect(output('replace', 'a.b.c', { find: '.', with: '$&' })).toBe('a$&b$&c');
    expect(output('replace', 'abc', { find: '' })).toBe('abc');
  });

  it('converts case per line via case.ts', () => {
    expect(output('case', 'First Name\nuserId')).toBe('first_name\nuser_id');
    expect(output('case', 'first name', { to: 'pascal' })).toBe('FirstName');
  });
});

describe('json operations', () => {
  it('formats, minifies and sorts keys', () => {
    expect(output('json-format', '{"b":1,"a":[1]}')).toBe('{\n  "b": 1,\n  "a": [\n    1\n  ]\n}');
    expect(output('json-format', '{"a":1}', { indent: '4' })).toBe('{\n    "a": 1\n}');
    expect(output('json-minify', '{ "a" : [ 1 , 2 ] }')).toBe('{"a":[1,2]}');
    expect(output('json-sort-keys', '{"b":1,"a":2}', { indent: 'min' })).toBe('{"a":2,"b":1}');
    expect(output('json-format', '   ')).toBe('');
  });

  it('reports parse errors as codes with position', () => {
    expect(run('json-format', '{\n  "a": 1,\n}')).toEqual({
      ok: false,
      error: {
        code: 'json-invalid',
        data: { reason: 'trailing-comma', before: '}', line: 2, column: 9 },
      },
    });
  });
});

describe('sql operations', () => {
  it('builds IN clauses from text and numbers', () => {
    expect(output('sql-in-text', "a\nb\na\nO'Brien")).toBe("IN ('a', 'b', 'O''Brien')");
    expect(output('sql-in-text', 'a\nb', { column: 'id', not: 'yes', quote: 'double' })).toBe(
      'id NOT IN ("a", "b")',
    );
    expect(output('sql-in-text', 'a,b')).toBe("IN ('a,b')");
    expect(output('sql-in-text', 'a,b', { split: 'any' })).toBe("IN ('a', 'b')");
    expect(output('sql-in-numbers', '3\n1\n3', { sorted: 'yes' })).toBe('IN (1, 3)');
  });

  it('fails on invalid numbers and columns', () => {
    expect(run('sql-in-numbers', '1\nx\n2')).toEqual({
      ok: false,
      error: { code: 'sql-invalid-numbers', data: { count: 1, values: 'x' } },
    });
    expect(run('sql-in-text', 'a', { column: '1bad' })).toEqual({
      ok: false,
      error: { code: 'sql-invalid-column', data: { column: '1bad' } },
    });
    expect(run('sql-like', 'a', { column: '' })).toEqual({
      ok: false,
      error: { code: 'sql-column-required' },
    });
  });

  it('builds LIKE chains and wrapped lists', () => {
    expect(output('sql-like', 'foo\nbar')).toBe("(name LIKE '%foo%' OR name LIKE '%bar%')");
    expect(output('sql-like', 'foo', { column: 'title', match: 'starts', ilike: 'yes' })).toBe(
      "title ILIKE 'foo%'",
    );
    expect(output('sql-list', 'a\nb', { wrapper: 'array' })).toBe("ARRAY['a', 'b']");
    expect(output('sql-list', 'a\nb', { wrapper: 'plain', quote: 'none' })).toBe('a, b');
  });
});

describe('id operations', () => {
  it('formats RUT, CPF and CNPJ per line, keeping blank lines', () => {
    expect(output('rut-format', '123456785\n\n10000013k')).toBe('12.345.678-5\n\n10.000.013-K');
    expect(output('rut-format', '12.345.678-5', { style: 'plain' })).toBe('123456785');
    expect(output('cpf-format', '52998224725')).toBe('529.982.247-25');
    expect(output('cnpj-format', '11222333000181', { style: 'dash' })).toBe('112223330001-81');
  });

  it('reports the first line that does not parse', () => {
    expect(run('rut-format', '123456785\nhello')).toEqual({
      ok: false,
      error: { code: 'id-invalid', data: { line: 2, value: 'hello' } },
    });
    expect(run('cpf-format', '123')).toEqual({
      ok: false,
      error: { code: 'id-invalid', data: { line: 1, value: '123' } },
    });
  });
});

describe('time operations', () => {
  it('converts timestamps and dates per line', () => {
    expect(output('unix', '0\n1700000000000')).toBe(
      '1970-01-01T00:00:00.000Z\n2023-11-14T22:13:20.000Z',
    );
    expect(output('unix', '2023-11-14T22:13:20Z', { to: 'seconds' })).toBe('1700000000');
    expect(output('unix', '1700000000', { to: 'milliseconds' })).toBe('1700000000000');
    expect(run('unix', '0\nnot a date')).toEqual({
      ok: false,
      error: { code: 'time-invalid', data: { line: 2, value: 'not a date' } },
    });
  });
});

describe('encoding operations', () => {
  it('round-trips base64 with UTF-8', () => {
    const encoded = output('base64-encode', 'héllo 👋');
    expect(encoded).toBe('aMOpbGxvIPCfkYs=');
    expect(output('base64-decode', encoded)).toBe('héllo 👋');
    expect(output('base64-encode', 'héllo 👋', { variant: 'url' })).toBe('aMOpbGxvIPCfkYs');
    expect(output('base64-decode', 'aMOpbGxvIPCfkYs')).toBe('héllo 👋');
    expect(output('base64-decode', 'aGVs\nbG8=')).toBe('hello');
  });

  it('rejects invalid base64 and non UTF-8 bytes', () => {
    expect(run('base64-decode', 'abc$')).toEqual({ ok: false, error: { code: 'base64-invalid' } });
    expect(run('base64-decode', 'a')).toEqual({ ok: false, error: { code: 'base64-invalid' } });
    expect(run('base64-decode', '/w==')).toEqual({ ok: false, error: { code: 'base64-not-utf8' } });
  });

  it('encodes and decodes URLs', () => {
    expect(output('url-encode', 'a b&c=ñ')).toBe('a%20b%26c%3D%C3%B1');
    expect(output('url-encode', 'https://x.cl/a b?q=1', { mode: 'uri' })).toBe(
      'https://x.cl/a%20b?q=1',
    );
    expect(output('url-decode', 'a%20b+c')).toBe('a b+c');
    expect(output('url-decode', 'a%20b+c', { plus: 'yes' })).toBe('a b c');
    expect(run('url-decode', '%E0%A4%A')).toEqual({ ok: false, error: { code: 'url-invalid' } });
    expect(run('url-encode', '\uD800')).toEqual({ ok: false, error: { code: 'url-invalid' } });
  });
});

const BS = String.fromCharCode(92);

describe('html entity operations', () => {
  it('encodes with scope and format options', () => {
    expect(output('html-encode', '<a> & é')).toBe('&lt;a&gt; &amp; é');
    expect(output('html-encode', 'é 😀', { scope: 'non-ascii' })).toBe('&eacute; &#128512;');
    expect(output('html-encode', 'é', { scope: 'non-ascii', format: 'hex' })).toBe('&#xE9;');
    expect(output('html-encode', '<', { format: 'bogus' })).toBe('&lt;');
  });

  it('decodes entities and keeps unknown ones', () => {
    expect(output('html-decode', '&lt;b&gt; &#233; &#x1F600; &foo;')).toBe('<b> é 😀 &foo;');
    expect(output('html-decode', '&amp;amp;')).toBe('&amp;');
  });
});

describe('json string operations', () => {
  it('escapes with quote and ASCII options', () => {
    expect(output('json-escape', 'a"\n')).toBe(`a${BS}"${BS}n`);
    expect(output('json-escape', 'é', { quotes: 'yes', ascii: 'yes' })).toBe(`"${BS}u00e9"`);
  });

  it('unescapes and reports bad escapes with a position', () => {
    expect(output('json-unescape', `"${BS}ud83d${BS}ude00 ${BS}"x${BS}""`)).toBe('😀 "x"');
    expect(run('json-unescape', `ok\n${BS}x`)).toEqual({
      ok: false,
      error: {
        code: 'json-unescape-invalid',
        data: { reason: 'invalid-escape', sequence: `${BS}x`, line: 2, column: 1 },
      },
    });
  });

  it('round-trips through escape and unescape', () => {
    const sample = `línea "1"\n${BS} 😀`;
    expect(output('json-unescape', output('json-escape', sample, { quotes: 'yes' }))).toBe(sample);
  });
});
