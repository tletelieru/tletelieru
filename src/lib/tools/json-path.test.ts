import { describe, expect, it } from 'vitest';
import { checkPathSyntax, queryJsonPath, renderMatches } from './json-path';

const store = JSON.stringify({
  store: {
    book: [
      { title: 'A', price: 8, tags: ['x'] },
      { title: 'B', price: 22 },
    ],
    bicycle: { color: 'red', price: 19.95 },
  },
});

describe('queryJsonPath', () => {
  it('returns matches with normalized paths and pointers', () => {
    expect(queryJsonPath(store, '$.store.book[*].title')).toEqual({
      ok: true,
      matches: [
        { path: "$['store']['book'][0]['title']", pointer: '/store/book/0/title', value: 'A' },
        { path: "$['store']['book'][1]['title']", pointer: '/store/book/1/title', value: 'B' },
      ],
    });
  });

  it('supports recursive descent and filters', () => {
    const result = queryJsonPath(store, '$..book[?(@.price < 10)].title');
    expect(result.ok && result.matches.map((match) => match.value)).toEqual(['A']);
  });

  it('supports recursive descent on a key', () => {
    const result = queryJsonPath(store, '$..price');
    expect(result.ok && result.matches.map((match) => match.value)).toEqual([8, 22, 19.95]);
  });

  it('returns an empty list when nothing matches', () => {
    expect(queryJsonPath(store, '$.nope')).toEqual({ ok: true, matches: [] });
  });

  it('requires a path', () => {
    expect(queryJsonPath(store, '  ')).toEqual({ ok: false, error: { code: 'pathRequired' } });
  });

  it('reports invalid JSON', () => {
    expect(queryJsonPath('{"a":', '$')).toMatchObject({
      ok: false,
      error: { code: 'invalidJson', error: { line: 1, column: 6 } },
    });
  });

  it('reports invalid paths', () => {
    expect(queryJsonPath(store, 'store.book')).toEqual({
      ok: false,
      error: { code: 'invalidPath', reason: 'root' },
    });
    expect(queryJsonPath(store, '$.a[0')).toEqual({
      ok: false,
      error: { code: 'invalidPath', reason: 'unclosed', char: '[', position: 4 },
    });
  });

  it('reports filter errors from the engine', () => {
    expect(queryJsonPath(store, '$..[?(@.x ==)]')).toMatchObject({
      ok: false,
      error: { code: 'invalidPath', reason: 'engine' },
    });
  });
});

describe('checkPathSyntax', () => {
  it.each([
    ['$', null],
    ["$['a]']", null],
    ['$.a]', { reason: 'unbalanced', char: ']', position: 4 }],
    ['$[?(@.a)]', null],
    ['$[(]', { reason: 'unbalanced', char: ']', position: 4 }],
    ["$['a", { reason: 'unclosed', char: "'", position: 3 }],
  ])('checks %j', (path, expected) => {
    expect(checkPathSyntax(path)).toEqual(expected);
  });
});

describe('renderMatches', () => {
  const matches = [
    { path: "$['a']", pointer: '/a', value: 1 },
    { path: "$['b']", pointer: '/b', value: { c: true } },
  ];

  it('renders values as a JSON array', () => {
    expect(renderMatches(matches, 'values')).toBe('[\n  1,\n  {\n    "c": true\n  }\n]');
  });

  it('renders paths and pointers one per line', () => {
    expect(renderMatches(matches, 'paths')).toBe("$['a']\n$['b']");
    expect(renderMatches(matches, 'pointers')).toBe('/a\n/b');
  });
});
