import { createLocalStore, isStringArray } from '../storage';

export const favoritesStore = createLocalStore<string[]>({
  key: 'tl:favorites',
  initial: [],
  parse: (raw) => (isStringArray(raw) ? raw : null),
});

export function toggleInList(list: readonly string[], slug: string): string[] {
  return list.includes(slug) ? list.filter((item) => item !== slug) : [...list, slug];
}

export function toggleFavorite(slug: string): void {
  favoritesStore.set((list) => toggleInList(list, slug));
}
