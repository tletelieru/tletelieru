import { isSnippet, normalizeTags, type Snippet } from '../user-data/snippets';
import { sortByUpdated } from './search';

export interface MergeResult {
  snippets: Snippet[];
  imported: number;
  skipped: number;
}

export interface ParsedImport {
  snippets: Snippet[];
  invalid: number;
}

export function mergeSnippets(
  existing: readonly Snippet[],
  incoming: readonly Snippet[],
): MergeResult {
  const byId = new Map(existing.map((snippet) => [snippet.id, snippet]));
  let imported = 0;
  let skipped = 0;
  for (const snippet of incoming) {
    const current = byId.get(snippet.id);
    if (current && current.updatedAt >= snippet.updatedAt) {
      skipped += 1;
      continue;
    }
    byId.set(snippet.id, snippet);
    imported += 1;
  }
  return { snippets: sortByUpdated([...byId.values()]), imported, skipped };
}

function extractItems(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && data !== null) {
    const items = (data as Record<string, unknown>).snippets;
    if (Array.isArray(items)) return items;
  }
  return null;
}

export function parseSnippetFile(text: string): ParsedImport | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  const items = extractItems(data);
  if (!items) return null;
  const snippets = items
    .filter(isSnippet)
    .map((snippet) => ({ ...snippet, tags: normalizeTags(snippet.tags) }));
  return { snippets, invalid: items.length - snippets.length };
}

export function serializeSnippets(list: readonly Snippet[], exportedAt: number): string {
  return JSON.stringify({ version: 1, exportedAt, snippets: list }, null, 2);
}

export function exportFileName(now: number): string {
  return `snippets-${new Date(now).toISOString().slice(0, 10)}.json`;
}
