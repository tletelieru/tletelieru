import type { Snippet } from '../user-data/snippets';

export function foldText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function sortByUpdated(list: readonly Snippet[]): Snippet[] {
  return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function collectTags(list: readonly Snippet[]): string[] {
  return [...new Set(list.flatMap((snippet) => snippet.tags))].sort((a, b) => a.localeCompare(b));
}

export function filterSnippets(
  list: readonly Snippet[],
  query: string,
  tag?: string | null,
): Snippet[] {
  const terms = foldText(query).split(/\s+/).filter(Boolean);
  return sortByUpdated(
    list.filter((snippet) => {
      if (tag && !snippet.tags.includes(tag)) return false;
      if (terms.length === 0) return true;
      const haystack = foldText(
        [snippet.title, snippet.tags.join(' '), snippet.content].join('\n'),
      );
      return terms.every((term) => haystack.includes(term));
    }),
  );
}
