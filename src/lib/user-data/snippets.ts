import { createLocalStore, isStringArray } from '../storage';

export interface Snippet {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface SnippetDraft {
  title: string;
  content: string;
  tags: string[];
}

export function isSnippet(value: unknown): value is Snippet {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.content === 'string' &&
    isStringArray(item.tags) &&
    typeof item.createdAt === 'number' &&
    typeof item.updatedAt === 'number'
  );
}

export const snippetsStore = createLocalStore<Snippet[]>({
  key: 'tl:snippets',
  initial: [],
  parse: (raw) => (Array.isArray(raw) ? raw.filter(isSnippet) : null),
});

export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  for (const tag of tags) {
    const clean = tag.trim().toLowerCase();
    if (clean) seen.add(clean);
  }
  return [...seen];
}

export function createSnippet(draft: SnippetDraft, now: number, id: string): Snippet {
  return {
    id,
    title: draft.title.trim(),
    content: draft.content,
    tags: normalizeTags(draft.tags),
    createdAt: now,
    updatedAt: now,
  };
}

export function insertSnippet(list: readonly Snippet[], snippet: Snippet): Snippet[] {
  return [snippet, ...list.filter((item) => item.id !== snippet.id)];
}

export function patchSnippet(
  list: readonly Snippet[],
  id: string,
  draft: Partial<SnippetDraft>,
  now: number,
): Snippet[] {
  return list.map((item) =>
    item.id === id
      ? {
          ...item,
          ...(draft.title !== undefined ? { title: draft.title.trim() } : {}),
          ...(draft.content !== undefined ? { content: draft.content } : {}),
          ...(draft.tags !== undefined ? { tags: normalizeTags(draft.tags) } : {}),
          updatedAt: now,
        }
      : item,
  );
}

export function deleteSnippet(list: readonly Snippet[], id: string): Snippet[] {
  return list.filter((item) => item.id !== id);
}

export function newSnippetId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function saveSnippet(draft: SnippetDraft, now = Date.now(), id = newSnippetId()): Snippet {
  const snippet = createSnippet(draft, now, id);
  snippetsStore.set((list) => insertSnippet(list, snippet));
  return snippet;
}

export function updateSnippet(id: string, draft: Partial<SnippetDraft>, now = Date.now()): void {
  snippetsStore.set((list) => patchSnippet(list, id, draft, now));
}

export function removeSnippet(id: string): void {
  snippetsStore.set((list) => deleteSnippet(list, id));
}
