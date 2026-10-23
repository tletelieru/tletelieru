import type { Locale, Localized } from '~/i18n/locales';
import { STORE_CHANGE_EVENT } from './storage';
import { favoritesStore } from './user-data/favorites';
import source from './favorite-stars.inline.js?raw';

export const favoriteStarLabels: Localized<{ add: string; remove: string }> = {
  en: { add: 'Add to favorites', remove: 'Remove from favorites' },
  es: { add: 'Agregar a favoritos', remove: 'Quitar de favoritos' },
};

interface FavoriteStarsOptions {
  root: string;
  locale: Locale;
  paths?: Record<string, string>;
  observe?: boolean;
}

export function favoriteStarsScript({
  root,
  locale,
  paths,
  observe,
}: FavoriteStarsOptions): string {
  const config = {
    key: favoritesStore.key,
    event: STORE_CHANGE_EVENT,
    labels: favoriteStarLabels[locale],
    paths,
    observe,
  };
  const body = source.replace(/^export\s+/m, '').trim();
  const json = JSON.stringify(config).replace(/</g, '\u003c');
  return `(${body})(${root}, ${json});`;
}
