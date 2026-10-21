import { describe, expect, it } from 'vitest';
import {
  buildQuery,
  buildUrl,
  decodeUrlText,
  encodeUrlText,
  findEscapeIssue,
  findLoneSurrogate,
  parseQuery,
  parseUrl,
} from './url';

describe('encodeUrlText', () => {
  it('encodes a component', () => {
    expect(encodeUrlText('a b&c=d/ñ')).toEqual({ ok: true, value: 'a%20b%26c%3Dd%2F%C3%B1' });
  });

  it('encodes a full URI keeping reserved characters', () => {
    expect(encodeUrlText('https://x.cl/a b?q=ñ&r=1#h', { scope: 'uri' })).toEqual({
      ok: true,
      value: 'https://x.cl/a%20b?q=%C3%B1&r=1#h',
    });
  });

  it('uses + for spaces in form encoding', () => {
    expect(encodeUrlText('a b+c', { form: true })).toEqual({ ok: true, value: 'a+b%2Bc' });
  });

  it('reports lone surrogates with their position', () => {
    expect(encodeUrlText('ab\uD800c')).toEqual({
      ok: false,
      issue: { code: 'loneSurrogate', position: 2 },
    });
    expect(findLoneSurrogate('😀\uDC00')).toBe(2);
    expect(findLoneSurrogate('😀')).toBe(-1);
  });
});

describe('decodeUrlText', () => {
  it('decodes a component', () => {
    expect(decodeUrlText('a%20b%26c%3Dd%2F%C3%B1')).toEqual({ ok: true, value: 'a b&c=d/ñ' });
  });

  it('keeps reserved escapes when decoding a full URI', () => {
    expect(decodeUrlText('https://x.cl/a%20b?q=%26%C3%B1', { scope: 'uri' })).toEqual({
      ok: true,
      value: 'https://x.cl/a b?q=%26ñ',
    });
  });

  it('turns + into spaces only in form mode', () => {
    expect(decodeUrlText('a+b%2B')).toEqual({ ok: true, value: 'a+b+' });
    expect(decodeUrlText('a+b%2B', { form: true })).toEqual({ ok: true, value: 'a b+' });
  });

  it('reports malformed escapes with their position', () => {
    expect(decodeUrlText('abc%zz')).toEqual({
      ok: false,
      issue: { code: 'badEscape', position: 3 },
    });
    expect(findEscapeIssue('100%')).toEqual({ code: 'badEscape', position: 3 });
    expect(findEscapeIssue('%C3%2')).toEqual({ code: 'badEscape', position: 3 });
  });

  it('reports invalid UTF-8 sequences at their first escape', () => {
    expect(findEscapeIssue('ok%FF')).toEqual({ code: 'badUtf8', position: 2 });
    expect(findEscapeIssue('x%C3x')).toEqual({ code: 'badUtf8', position: 1 });
    expect(findEscapeIssue('%C3%41')).toEqual({ code: 'badUtf8', position: 0 });
    expect(findEscapeIssue('%ED%A0%80')).toEqual({ code: 'badUtf8', position: 0 });
    expect(findEscapeIssue('%E2%9C%93%F0%9F%98%80')).toBeNull();
  });
});

describe('parseQuery', () => {
  it('keeps duplicates in order with decoded and raw values', () => {
    expect(parseQuery('a=1&b=x+y&a=%C3%B1&flag&&c=')).toEqual([
      { key: 'a', value: '1', raw: 'a=1', position: 0 },
      { key: 'b', value: 'x y', raw: 'b=x+y', position: 4 },
      { key: 'a', value: 'ñ', raw: 'a=%C3%B1', position: 10 },
      { key: 'flag', value: '', raw: 'flag', position: 19 },
      { key: 'c', value: '', raw: 'c=', position: 25 },
    ]);
  });

  it('reports bad escapes at their absolute position and keeps the raw text', () => {
    expect(parseQuery('a=1&b=%G1', 10)).toEqual([
      { key: 'a', value: '1', raw: 'a=1', position: 10 },
      {
        key: 'b',
        value: '%G1',
        raw: 'b=%G1',
        position: 14,
        issue: { code: 'badEscape', position: 16 },
      },
    ]);
  });
});

describe('parseUrl', () => {
  it('splits a full URL into parts and params', () => {
    const result = parseUrl('https://user:pw@example.com:8443/a/b?x=1&y=two%20words&x=2#frag');
    expect(result).toEqual({
      kind: 'url',
      parts: {
        href: 'https://user:pw@example.com:8443/a/b?x=1&y=two%20words&x=2#frag',
        protocol: 'https:',
        username: 'user',
        password: 'pw',
        hostname: 'example.com',
        port: '8443',
        pathname: '/a/b',
        search: '?x=1&y=two%20words&x=2',
        hash: '#frag',
      },
      params: [
        { key: 'x', value: '1', raw: 'x=1', position: 37 },
        { key: 'y', value: 'two words', raw: 'y=two%20words', position: 41 },
        { key: 'x', value: '2', raw: 'x=2', position: 55 },
      ],
    });
  });

  it('parses a bare query string with or without ?', () => {
    expect(parseUrl('?a=1')).toEqual({
      kind: 'query',
      params: [{ key: 'a', value: '1', raw: 'a=1', position: 1 }],
    });
    expect(parseUrl('  a=1&b=2')).toMatchObject({
      kind: 'query',
      params: [
        { key: 'a', position: 2 },
        { key: 'b', position: 6 },
      ],
    });
  });

  it('reports invalid URLs and empty input', () => {
    expect(parseUrl('https://exa mple.com')).toEqual({ kind: 'invalid' });
    expect(parseUrl('   ')).toEqual({ kind: 'empty' });
  });

  it('handles opaque schemes', () => {
    expect(parseUrl('mailto:a@b.cl?subject=hola%20t%C3%BA')).toMatchObject({
      kind: 'url',
      parts: { protocol: 'mailto:', pathname: 'a@b.cl' },
      params: [{ key: 'subject', value: 'hola tú' }],
    });
  });
});

describe('buildQuery', () => {
  const rows = [
    { key: 'q', value: 'a b&c' },
    { key: '', value: '' },
    { key: 'tag', value: 'x' },
    { key: 'tag', value: 'ñ' },
  ];

  it('encodes rows and skips empty ones', () => {
    expect(buildQuery(rows)).toBe('q=a%20b%26c&tag=x&tag=%C3%B1');
    expect(buildQuery(rows, { form: true })).toBe('q=a+b%26c&tag=x&tag=%C3%B1');
  });

  it('round trips through parseQuery', () => {
    expect(parseQuery(buildQuery(rows)).map(({ key, value }) => ({ key, value }))).toEqual(
      rows.filter((row) => row.key),
    );
  });

  it('replaces lone surrogates instead of throwing', () => {
    expect(buildQuery([{ key: 'k', value: '\uD800' }])).toBe('k=%EF%BF%BD');
  });
});

describe('buildUrl', () => {
  const rows = [{ key: 'a', value: '1 2' }];

  it('replaces the existing query and keeps the hash', () => {
    expect(buildUrl('https://x.cl/p?old=1#top', rows)).toBe('https://x.cl/p?a=1%202#top');
  });

  it('returns the bare query without a base', () => {
    expect(buildUrl('', rows)).toBe('a=1%202');
    expect(buildUrl('https://x.cl/', [])).toBe('https://x.cl/');
  });
});
