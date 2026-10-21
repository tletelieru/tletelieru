import { describe, expect, it } from 'vitest';
import { toggleInList } from './favorites';
import { pushHistory, removeHistory } from './history';
import { pushRecent } from './recent';
import {
  createSnippet,
  deleteSnippet,
  insertSnippet,
  normalizeTags,
  patchSnippet,
} from './snippets';

describe('favorites', () => {
  it('toggles slugs in and out', () => {
    expect(toggleInList([], 'rut')).toEqual(['rut']);
    expect(toggleInList(['rut', 'cpf'], 'rut')).toEqual(['cpf']);
  });
});

describe('recent', () => {
  it('moves the visited tool to the front, dedupes and caps the list', () => {
    const list = pushRecent(
      [
        { slug: 'cpf', at: 1 },
        { slug: 'rut', at: 0 },
      ],
      'rut',
      5,
    );
    expect(list).toEqual([
      { slug: 'rut', at: 5 },
      { slug: 'cpf', at: 1 },
    ]);
    const long = Array.from({ length: 10 }, (_, index) => ({ slug: `t${index}`, at: index }));
    expect(pushRecent(long, 'new', 99, 8)).toHaveLength(8);
  });
});

describe('history', () => {
  it('keeps the latest distinct non-empty inputs per tool', () => {
    let map = pushHistory({}, 'rut', ' 12.345.678-5 ', 1);
    map = pushHistory(map, 'rut', '12.345.678-5', 2);
    expect(map.rut).toEqual([{ value: '12.345.678-5', at: 1 }]);
    map = pushHistory(map, 'rut', '11111111-1', 3);
    map = pushHistory(map, 'rut', '12.345.678-5', 4);
    expect(map.rut.map((entry) => entry.value)).toEqual(['12.345.678-5', '11111111-1']);
  });

  it('ignores blank and oversized values and caps entries', () => {
    expect(pushHistory({}, 'rut', '   ', 1)).toEqual({});
    expect(pushHistory({}, 'rut', 'x'.repeat(50), 1, { maxLength: 10 })).toEqual({});
    let map = {};
    for (let index = 0; index < 15; index++) map = pushHistory(map, 'json', `v${index}`, index);
    expect(pushHistory(map, 'json', 'last', 99, { limit: 10 }).json).toHaveLength(10);
  });

  it('clears one tool without touching the others', () => {
    const map = { rut: [{ value: 'a', at: 1 }], cpf: [{ value: 'b', at: 1 }] };
    expect(removeHistory(map, 'rut')).toEqual({ cpf: [{ value: 'b', at: 1 }] });
    expect(removeHistory(map, 'nope')).toBe(map);
  });
});

describe('snippets', () => {
  it('normalizes tags', () => {
    expect(normalizeTags([' SQL ', 'sql', '', 'Postgres'])).toEqual(['sql', 'postgres']);
  });

  it('creates, inserts, patches and deletes snippets', () => {
    const snippet = createSnippet(
      { title: ' Active users ', content: 'SELECT 1', tags: ['SQL'] },
      1,
      'a',
    );
    expect(snippet).toEqual({
      id: 'a',
      title: 'Active users',
      content: 'SELECT 1',
      tags: ['sql'],
      createdAt: 1,
      updatedAt: 1,
    });
    let list = insertSnippet([], snippet);
    list = insertSnippet(list, createSnippet({ title: 'b', content: 'x', tags: [] }, 2, 'b'));
    expect(list.map((item) => item.id)).toEqual(['b', 'a']);
    list = patchSnippet(list, 'a', { content: 'SELECT 2' }, 3);
    expect(list.find((item) => item.id === 'a')).toMatchObject({
      content: 'SELECT 2',
      updatedAt: 3,
    });
    expect(deleteSnippet(list, 'b').map((item) => item.id)).toEqual(['a']);
  });
});
