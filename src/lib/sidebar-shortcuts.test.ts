import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { STORE_CHANGE_EVENT } from './storage';
import { toggleFavorite } from './user-data/favorites';
import { mountSidebarShortcuts } from './sidebar-shortcuts.inline.js';

const config = {
  index: {
    rut: { name: 'RUT (Chile)', href: '/tletelieru/es/tools/ids/rut/' },
    cpf: { name: 'CPF <Brasil>', href: '/tletelieru/es/tools/ids/cpf/' },
  },
  labels: {
    favorites: 'Favoritos',
    recent: 'Recientes',
    clear: 'Borrar',
    clearRecent: 'Borrar recientes',
  },
  limit: 8,
  favoritesKey: 'tl:favorites',
  recentKey: 'tl:recent',
  event: STORE_CHANGE_EVENT,
};

function mount() {
  const container = document.createElement('nav');
  document.body.append(container);
  mountSidebarShortcuts(container, config);
  return container;
}

describe('mountSidebarShortcuts', () => {
  beforeEach(() => window.history.replaceState(null, '', '/tletelieru/es/tools/ids/rut/'));

  afterEach(() => {
    window.localStorage.clear();
    document.body.innerHTML = '';
  });

  it('stays hidden when there is nothing to show', () => {
    const container = mount();
    expect(container.hidden).toBe(true);
    expect(container.innerHTML).toBe('');
  });

  it('renders favorites and recent synchronously, escaping names and marking the current page', () => {
    window.localStorage.setItem('tl:favorites', JSON.stringify(['cpf', 'unknown']));
    window.localStorage.setItem(
      'tl:recent',
      JSON.stringify([
        { slug: 'rut', at: 1 },
        { slug: 'cpf', at: 0 },
      ]),
    );
    const container = mount();
    expect(container.hidden).toBe(false);
    const headings = [...container.querySelectorAll('h2')].map(
      (heading) => heading.firstChild?.textContent,
    );
    expect(headings).toEqual(['Favoritos', 'Recientes']);
    expect(container.querySelector('a')?.textContent).toBe('CPF <Brasil>');
    expect(container.querySelector('a[aria-current="page"]')?.textContent).toBe('RUT (Chile)');
  });

  it('clears recent from its button', () => {
    window.localStorage.setItem('tl:recent', JSON.stringify([{ slug: 'rut', at: 1 }]));
    const container = mount();
    container.querySelector<HTMLButtonElement>('[data-clear-recent]')?.click();
    expect(window.localStorage.getItem('tl:recent')).toBe('[]');
    expect(container.hidden).toBe(true);
  });

  it('re-renders when a store changes on the same page or in another tab', () => {
    const container = mount();
    toggleFavorite('rut');
    expect(container.querySelector('a')?.textContent).toBe('RUT (Chile)');
    window.localStorage.setItem('tl:recent', JSON.stringify([{ slug: 'cpf', at: 2 }]));
    window.dispatchEvent(new StorageEvent('storage', { key: 'tl:recent' }));
    expect(container.querySelectorAll('section')).toHaveLength(2);
  });

  it('survives corrupt storage', () => {
    window.localStorage.setItem('tl:favorites', '{nope');
    expect(mount().hidden).toBe(true);
  });
});
