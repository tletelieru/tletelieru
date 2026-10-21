import { createLocalStore } from '../storage';

export interface HistoryEntry {
  value: string;
  at: number;
}

export type HistoryMap = Record<string, HistoryEntry[]>;

export const HISTORY_LIMIT = 10;
export const HISTORY_MAX_LENGTH = 20_000;

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.value === 'string' && typeof entry.at === 'number';
}

function parseHistory(raw: unknown): HistoryMap | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const result: HistoryMap = {};
  for (const [slug, entries] of Object.entries(raw)) {
    if (Array.isArray(entries)) result[slug] = entries.filter(isHistoryEntry);
  }
  return result;
}

export const historyStore = createLocalStore<HistoryMap>({
  key: 'tl:history',
  initial: {},
  parse: parseHistory,
});

export function pushHistory(
  map: HistoryMap,
  slug: string,
  value: string,
  now: number,
  { limit = HISTORY_LIMIT, maxLength = HISTORY_MAX_LENGTH } = {},
): HistoryMap {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return map;
  const current = map[slug] ?? [];
  if (current[0]?.value === trimmed) return map;
  const entries = [
    { value: trimmed, at: now },
    ...current.filter((entry) => entry.value !== trimmed),
  ];
  return { ...map, [slug]: entries.slice(0, limit) };
}

export function removeHistory(map: HistoryMap, slug: string): HistoryMap {
  if (!(slug in map)) return map;
  return Object.fromEntries(Object.entries(map).filter(([key]) => key !== slug));
}

export function addHistory(slug: string, value: string, now = Date.now()): void {
  historyStore.set((map) => pushHistory(map, slug, value, now));
}

export function clearHistory(slug: string): void {
  historyStore.set((map) => removeHistory(map, slug));
}
