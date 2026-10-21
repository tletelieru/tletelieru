import { describe, expect, it } from 'vitest';
import type { Snippet } from '../user-data/snippets';
import { collectTags, filterSnippets, foldText } from './search';

function snippet(
  id: string,
  title: string,
  content: string,
  tags: string[],
  updatedAt: number,
): Snippet {
  return { id, title, content, tags, createdAt: 0, updatedAt };
}

const list = [
  snippet('a', 'Canción SELECT', 'select * from users', ['sql'], 1),
  snippet('b', 'Curl login', 'curl -X POST /login', ['http', 'auth'], 3),
  snippet('c', 'Jsonb path', "data->>'name'", ['sql', 'json'], 2),
];

describe('foldText', () => {
  it('removes accents and lowercases', () => {
    expect(foldText('Canción ÁÉ')).toBe('cancion ae');
  });
});

describe('filterSnippets', () => {
  it('returns everything sorted by updated desc for an empty query', () => {
    expect(filterSnippets(list, '  ').map((item) => item.id)).toEqual(['b', 'c', 'a']);
  });

  it('matches title, tags and content ignoring case and accents', () => {
    expect(filterSnippets(list, 'CANCION').map((item) => item.id)).toEqual(['a']);
    expect(filterSnippets(list, 'auth').map((item) => item.id)).toEqual(['b']);
    expect(filterSnippets(list, "->>'name").map((item) => item.id)).toEqual(['c']);
  });

  it('requires every term to match', () => {
    expect(filterSnippets(list, 'sql users').map((item) => item.id)).toEqual(['a']);
    expect(filterSnippets(list, 'sql curl')).toEqual([]);
  });

  it('filters by tag', () => {
    expect(filterSnippets(list, '', 'sql').map((item) => item.id)).toEqual(['c', 'a']);
    expect(filterSnippets(list, 'jsonb', 'sql').map((item) => item.id)).toEqual(['c']);
    expect(filterSnippets(list, '', null)).toHaveLength(3);
  });
});

describe('collectTags', () => {
  it('returns unique sorted tags', () => {
    expect(collectTags(list)).toEqual(['auth', 'http', 'json', 'sql']);
  });
});
