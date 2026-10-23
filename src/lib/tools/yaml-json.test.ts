import { describe, expect, it } from 'vitest';
import { convertYamlJson, jsonToYaml, yamlToJson } from './yaml-json';

describe('yamlToJson', () => {
  it('converts mappings, sequences and scalars', () => {
    expect(yamlToJson('name: app\nport: 8080\ndebug: false\ntags:\n  - a\n  - b\nnone: ~')).toEqual(
      {
        ok: true,
        output:
          '{\n  "name": "app",\n  "port": 8080,\n  "debug": false,\n  "tags": [\n    "a",\n    "b"\n  ],\n  "none": null\n}',
        documents: 1,
      },
    );
  });

  it('indents with 4 spaces', () => {
    expect(yamlToJson('a: 1', { indent: '4' })).toMatchObject({ output: '{\n    "a": 1\n}' });
  });

  it('resolves anchors and aliases', () => {
    expect(yamlToJson('base: &b\n  x: 1\ncopy: *b', { indent: '2' })).toMatchObject({
      output: '{\n  "base": {\n    "x": 1\n  },\n  "copy": {\n    "x": 1\n  }\n}',
    });
  });

  it('keeps dates as strings', () => {
    expect(yamlToJson('d: 2026-01-01')).toMatchObject({ output: '{\n  "d": "2026-01-01"\n}' });
  });

  it('turns several documents into an array', () => {
    expect(yamlToJson('a: 1\n---\nb: 2')).toMatchObject({
      ok: true,
      output: '[\n  {\n    "a": 1\n  },\n  {\n    "b": 2\n  }\n]',
      documents: 2,
    });
  });

  it('reports the error line, column and an excerpt', () => {
    expect(yamlToJson('a: 1\nb: "open')).toEqual({
      ok: false,
      error: {
        code: 'yaml',
        error: {
          code: 'MISSING_CHAR',
          message: 'Missing closing "quote',
          line: 2,
          column: 9,
          excerpt: '2 | b: "open\n  |         ^',
        },
      },
    });
  });

  it('reports duplicate keys', () => {
    expect(yamlToJson('a: 1\na: 2')).toMatchObject({
      ok: false,
      error: { error: { code: 'DUPLICATE_KEY', line: 2, column: 1 } },
    });
  });

  it('returns nothing for blank input', () => {
    expect(yamlToJson('\n')).toEqual({ ok: true, output: '', documents: 0 });
  });
});

describe('jsonToYaml', () => {
  it('converts JSON to block YAML', () => {
    expect(jsonToYaml('{"a":[1,{"b":null}],"s":"two\\nlines"}')).toEqual({
      ok: true,
      output: 'a:\n  - 1\n  - b: null\ns: |-\n  two\n  lines\n',
      documents: 1,
    });
  });

  it('indents with 4 spaces', () => {
    expect(jsonToYaml('{"a":{"b":1}}', { indent: '4' })).toMatchObject({
      output: 'a:\n    b: 1\n',
    });
  });

  it('quotes strings that would change type', () => {
    expect(jsonToYaml('{"a":"true","b":"1"}')).toMatchObject({ output: 'a: "true"\nb: "1"\n' });
  });

  it('reports invalid JSON', () => {
    expect(jsonToYaml('{a: 1}')).toMatchObject({
      ok: false,
      error: { code: 'json', error: { code: 'unquoted-key', line: 1, column: 2 } },
    });
  });
});

describe('convertYamlJson', () => {
  it('round-trips', () => {
    const json = '{\n  "a": [\n    1,\n    "x"\n  ]\n}';
    const yaml = convertYamlJson(json, 'json2yaml');
    expect(yaml.ok && convertYamlJson(yaml.output, 'yaml2json')).toMatchObject({ output: json });
  });
});
