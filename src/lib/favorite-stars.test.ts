import { afterEach, describe, expect, it } from 'vitest';
import { mountFavoriteStars } from './favorite-stars.inline.js';
import { favoriteStarsScript } from './favorite-stars';
import { STORE_CHANGE_EVENT } from './storage';
import { favoritesStore, toggleFavorite } from './user-data/favorites';

const config = {
  key: favoritesStore.key,
  event: STORE_CHANGE_EVENT,
  labels: { add: 'Agregar a favoritos', remove: 'Quitar de favoritos' },
  paths: {
    rut: '/tletelieru/es/tools/ids/rut/',
    cpf: '/tletelieru/es/tools/ids/cpf/',
  },
  observe: true,
};

function sidebar() {
  const root = document.createElement('nav');
  root.innerHTML = `<ul>
    <li><a href="/tletelieru/es/tools/ids/rut/">RUT</a></li>
    <li><a href="/tletelieru/es/tools/ids/cpf">CPF</a></li>
    <li><a href="/tletelieru/es/tools/">Todas</a></li>
  </ul>`;
  document.body.append(root);
  return root;
}

const stars = (root: Element) =>
  Array.from(root.querySelectorAll<HTMLButtonElement>('[data-favorite-star]'));

afterEach(() => {
  document.body.innerHTML = '';
  window.localStorage.clear();
});

describe('mountFavoriteStars', () => {
  it('adds a star next to every tool link and none to other links', () => {
    const root = sidebar();
    mountFavoriteStars(root, config);
    expect(stars(root).map((star) => star.dataset.favoriteStar)).toEqual(['rut', 'cpf']);
    expect(stars(root)[0]?.getAttribute('aria-label')).toBe('Agregar a favoritos');
  });

  it('toggles the favorite on click without following the link', () => {
    const root = sidebar();
    mountFavoriteStars(root, config);
    const [rut] = stars(root);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    rut?.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(favoritesStore.get()).toEqual(['rut']);
    expect(rut?.getAttribute('aria-pressed')).toBe('true');
    expect(rut?.getAttribute('aria-label')).toBe('Quitar de favoritos');
    rut?.click();
    expect(favoritesStore.get()).toEqual([]);
    expect(rut?.getAttribute('aria-pressed')).toBe('false');
  });

  it('follows favorites changed elsewhere', () => {
    const root = sidebar();
    mountFavoriteStars(root, config);
    toggleFavorite('cpf');
    expect(stars(root)[1]?.getAttribute('aria-pressed')).toBe('true');
  });

  it('decorates links rendered later', async () => {
    const root = sidebar();
    mountFavoriteStars(root, config);
    root
      .querySelector('ul')
      ?.insertAdjacentHTML('beforeend', '<li><a href="/tletelieru/es/tools/ids/rut/">RUT</a></li>');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(stars(root)).toHaveLength(3);
  });

  it('syncs a server-rendered title star', () => {
    window.localStorage.setItem(favoritesStore.key, JSON.stringify(['rut']));
    const row = document.createElement('div');
    row.innerHTML = '<h1>RUT</h1><button data-favorite-star="rut" aria-pressed="false"></button>';
    document.body.append(row);
    mountFavoriteStars(row, { ...config, paths: undefined, observe: false });
    expect(stars(row)[0]?.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('favoriteStarsScript', () => {
  it('inlines the mount function with an escaped config', () => {
    const script = favoriteStarsScript({ root: 'document.body', locale: 'en' });
    expect(script).toMatch(/^\(function mountFavoriteStars/);
    expect(script).toContain('"add":"Add to favorites"');
    expect(script).not.toContain('export');
  });
});
