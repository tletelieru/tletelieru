import { describe, expect, it } from 'vitest';
import { escapeJsonString, prettyEmbeddedJson, unescapeJsonString } from './json-escape';

describe('escapeJsonString', () => {
  it('escapes quotes, backslashes and short escapes', () => {
    expect(escapeJsonString('say "hi"\\\n\t\r\b\f')).toBe('say \\"hi\\"\\\\\\n\\t\\r\\b\\f');
  });

  it('wraps in quotes when asked', () => {
    expect(escapeJsonString('a"b', { quotes: true })).toBe('"a\\"b"');
  });

  it('uses \\uXXXX for other control characters', () => {
    expect(escapeJsonString('\u0000\u001f\u0007')).toBe('\\u0000\\u001f\\u0007');
  });

  it('keeps non-ASCII by default and escapes it on request', () => {
    expect(escapeJsonString('é😀')).toBe('é😀');
    expect(escapeJsonString('é😀/', { asciiOnly: true })).toBe('\\u00e9\\ud83d\\ude00/');
  });

  it('always escapes lone surrogates', () => {
    expect(escapeJsonString('a\ud83db\ude00')).toBe('a\\ud83db\\ude00');
  });

  it('matches JSON.stringify for regular text', () => {
    const sample = 'línea "1"\n\ttab \\ 😀 \u0001';
    expect(escapeJsonString(sample, { quotes: true })).toBe(JSON.stringify(sample));
  });
});

describe('unescapeJsonString', () => {
  it('unescapes with and without surrounding quotes', () => {
    expect(unescapeJsonString('"say \\"hi\\""')).toEqual({
      ok: true,
      text: 'say "hi"',
      quoted: true,
      escapes: 2,
    });
    expect(unescapeJsonString('a\\nb\\\\c\\/')).toEqual({
      ok: true,
      text: 'a\nb\\c/',
      quoted: false,
      escapes: 3,
    });
  });

  it('decodes \\u escapes and surrogate pairs', () => {
    expect(unescapeJsonString('caf\\u00e9 \\ud83d\\ude00')).toMatchObject({
      ok: true,
      text: 'café 😀',
    });
    expect(unescapeJsonString('\\u00E9')).toMatchObject({ text: 'é' });
  });

  it('ignores whitespace around a quoted string', () => {
    expect(unescapeJsonString('  "x\\ty"\n')).toMatchObject({ text: 'x\ty', quoted: true });
  });

  it('reports invalid escapes with their position', () => {
    expect(unescapeJsonString('ab\\xcd')).toEqual({
      ok: false,
      error: { code: 'invalid-escape', offset: 2, sequence: '\\x' },
    });
  });

  it('reports bad unicode escapes', () => {
    expect(unescapeJsonString('a\\u12g4')).toEqual({
      ok: false,
      error: { code: 'invalid-unicode', offset: 1, sequence: '\\u12g4' },
    });
    expect(unescapeJsonString('"\\u12"')).toMatchObject({
      error: { code: 'invalid-unicode', offset: 1, sequence: '\\u12' },
    });
  });

  it('reports lone surrogates', () => {
    expect(unescapeJsonString('x\\ud83d')).toEqual({
      ok: false,
      error: { code: 'lone-surrogate', offset: 1, sequence: '\\ud83d' },
    });
    expect(unescapeJsonString('\\ud83d\\u0041')).toMatchObject({
      error: { code: 'lone-surrogate', offset: 0 },
    });
    expect(unescapeJsonString('\\ude00')).toMatchObject({ error: { code: 'lone-surrogate' } });
    expect(unescapeJsonString('a\ud83d')).toMatchObject({
      error: { code: 'lone-surrogate', offset: 1 },
    });
  });

  it('reports a trailing backslash', () => {
    expect(unescapeJsonString('abc\\')).toMatchObject({
      error: { code: 'incomplete-escape', offset: 3 },
    });
    expect(unescapeJsonString('"abc\\"')).toMatchObject({
      error: { code: 'incomplete-escape', offset: 4 },
    });
  });

  it('is strict inside quotes and lenient without them', () => {
    expect(unescapeJsonString('"a"b"')).toMatchObject({
      error: { code: 'unescaped-quote', offset: 2 },
    });
    expect(unescapeJsonString('"a\nb"')).toMatchObject({
      error: { code: 'control-char', offset: 2 },
    });
    expect(unescapeJsonString('a "b"\nc')).toMatchObject({ ok: true, text: 'a "b"\nc' });
  });

  it('round-trips with escapeJsonString', () => {
    const samples = ['', 'plain', 'say "hi"\n\\ 😀 é \u0000', '{"a":[1,"x"]}'];
    for (const sample of samples) {
      for (const quotes of [false, true]) {
        for (const asciiOnly of [false, true]) {
          const escaped = escapeJsonString(sample, { quotes, asciiOnly });
          expect(unescapeJsonString(escaped)).toMatchObject({ ok: true, text: sample });
          if (quotes) expect(JSON.parse(escaped)).toBe(sample);
        }
      }
    }
  });
});

describe('prettyEmbeddedJson', () => {
  it('pretty-prints stringified JSON', () => {
    const result = unescapeJsonString('"{\\"a\\":1,\\"b\\":[true]}"');
    expect(result.ok && prettyEmbeddedJson(result.text)).toBe(
      '{\n  "a": 1,\n  "b": [\n    true\n  ]\n}',
    );
  });

  it('returns null for text that is not a JSON container', () => {
    expect(prettyEmbeddedJson('hello')).toBeNull();
    expect(prettyEmbeddedJson('42')).toBeNull();
    expect(prettyEmbeddedJson('{bad}')).toBeNull();
  });
});
