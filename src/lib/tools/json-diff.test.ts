import { describe, expect, it } from 'vitest';
import { canonical, childPath, diffJson, diffValues, formatChanges } from './json-diff';

describe('diffValues', () => {
  it('ignores key order and lists added, removed and changed paths', () => {
    expect(
      diffValues({ a: 1, b: { c: true }, d: 'x' }, { b: { c: false }, a: 1, e: null }),
    ).toEqual([
      { op: 'changed', path: '$.b.c', before: true, after: false },
      { op: 'removed', path: '$.d', value: 'x' },
      { op: 'added', path: '$.e', value: null },
    ]);
  });

  it('compares arrays by index', () => {
    expect(diffValues([1, 2], [2, 1, 3])).toEqual([
      { op: 'changed', path: '$[0]', before: 1, after: 2 },
      { op: 'changed', path: '$[1]', before: 2, after: 1 },
      { op: 'added', path: '$[2]', value: 3 },
    ]);
  });

  it('compares arrays as sets', () => {
    expect(diffValues([1, { a: 1, b: 2 }, 4], [{ b: 2, a: 1 }, 1, 3], 'set')).toEqual([
      { op: 'removed', path: '$[2]', value: 4 },
      { op: 'added', path: '$[2]', value: 3 },
    ]);
  });

  it('reports type changes', () => {
    expect(diffValues({ a: [1] }, { a: { 0: 1 } })).toEqual([
      { op: 'changed', path: '$.a', before: [1], after: { 0: 1 } },
    ]);
  });

  it('returns nothing for equal values', () => {
    expect(diffValues({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toEqual([]);
  });
});

describe('helpers', () => {
  it('quotes keys that are not identifiers', () => {
    expect(childPath('$', 'a-b')).toBe('$["a-b"]');
    expect(childPath('$', 'ok')).toBe('$.ok');
    expect(childPath('$', 3)).toBe('$[3]');
  });

  it('builds a canonical form with sorted keys', () => {
    expect(canonical({ b: 1, a: [true, null] })).toBe('{"a":[true,null],"b":1}');
  });

  it('formats changes', () => {
    expect(
      formatChanges([
        { op: 'added', path: '$.a', value: 1 },
        { op: 'removed', path: '$.b', value: 'x' },
        { op: 'changed', path: '$.c', before: 1, after: 2 },
      ]),
    ).toBe('+ $.a: 1\n- $.b: "x"\n~ $.c: 1 → 2');
  });
});

describe('diffJson', () => {
  it('counts the changes', () => {
    expect(diffJson('{"a":1}', '{"a":2,"b":3}')).toMatchObject({
      ok: true,
      counts: { added: 1, removed: 0, changed: 1 },
    });
  });

  it('reports which side is invalid', () => {
    expect(diffJson('{"a":1}', '{"a":}')).toMatchObject({
      ok: false,
      side: 'right',
      error: { line: 1, column: 6 },
    });
    expect(diffJson('[', '[]')).toMatchObject({ ok: false, side: 'left' });
  });
});
