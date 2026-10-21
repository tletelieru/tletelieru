import { describe, expect, it } from 'vitest';
import type { Snippet } from '../user-data/snippets';
import { exportFileName, mergeSnippets, parseSnippetFile, serializeSnippets } from './transfer';

function snippet(id: string, updatedAt: number, title = id): Snippet {
  return { id, title, content: 'x', tags: [], createdAt: 0, updatedAt };
}

describe('mergeSnippets', () => {
  it('adds new ids, replaces older ones and skips stale or equal ones', () => {
    const existing = [snippet('a', 5), snippet('b', 5)];
    const incoming = [snippet('a', 9, 'newer'), snippet('b', 5, 'same'), snippet('c', 1)];
    const result = mergeSnippets(existing, incoming);
    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.snippets.map((item) => [item.id, item.title])).toEqual([
      ['a', 'newer'],
      ['b', 'b'],
      ['c', 'c'],
    ]);
  });

  it('keeps the newest copy when the import repeats an id', () => {
    const result = mergeSnippets([], [snippet('a', 1, 'old'), snippet('a', 2, 'new')]);
    expect(result.snippets).toEqual([snippet('a', 2, 'new')]);
    expect(result.imported).toBe(2);
  });
});

describe('parseSnippetFile', () => {
  it('reads exported files and plain arrays, counting invalid items', () => {
    const exported = serializeSnippets([snippet('a', 1)], 10);
    expect(parseSnippetFile(exported)).toEqual({ snippets: [snippet('a', 1)], invalid: 0 });
    const raw = JSON.stringify([{ ...snippet('b', 1), tags: [' SQL ', 'sql'] }, { id: 3 }]);
    expect(parseSnippetFile(raw)).toEqual({
      snippets: [{ ...snippet('b', 1), tags: ['sql'] }],
      invalid: 1,
    });
  });

  it('rejects broken JSON or unexpected shapes', () => {
    expect(parseSnippetFile('{nope')).toBeNull();
    expect(parseSnippetFile('{"foo": 1}')).toBeNull();
    expect(parseSnippetFile('42')).toBeNull();
  });
});

describe('exportFileName', () => {
  it('uses the ISO date', () => {
    expect(exportFileName(Date.UTC(2026, 9, 21, 12))).toBe('snippets-2026-10-21.json');
  });
});
