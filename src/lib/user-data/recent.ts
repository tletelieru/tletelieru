import { createLocalStore } from '../storage';

export interface RecentEntry {
  slug: string;
  at: number;
}

export const RECENT_LIMIT = 8;

function isRecentEntry(value: unknown): value is RecentEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.slug === 'string' && typeof entry.at === 'number';
}

export const recentStore = createLocalStore<RecentEntry[]>({
  key: 'tl:recent',
  initial: [],
  parse: (raw) => (Array.isArray(raw) ? raw.filter(isRecentEntry) : null),
});

export function pushRecent(
  list: readonly RecentEntry[],
  slug: string,
  now: number,
  limit = RECENT_LIMIT,
): RecentEntry[] {
  return [{ slug, at: now }, ...list.filter((entry) => entry.slug !== slug)].slice(0, limit);
}

export function recordVisit(slug: string, now = Date.now()): void {
  recentStore.set((list) => pushRecent(list, slug, now));
}

export function clearRecent(): void {
  recentStore.set([]);
}
