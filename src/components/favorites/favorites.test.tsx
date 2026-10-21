import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import { favoritesStore } from '~/lib/user-data/favorites';
import { recentStore } from '~/lib/user-data/recent';
import { FavoriteButton } from './FavoriteButton';
import { isCurrentPath, resolveLinks } from './resolve';
import SidebarShortcuts from './SidebarShortcuts';

function seed(favorites: string[], recent: string[]) {
  window.localStorage.setItem(favoritesStore.key, JSON.stringify(favorites));
  window.localStorage.setItem(
    recentStore.key,
    JSON.stringify(recent.map((slug, index) => ({ slug, at: 1000 - index }))),
  );
}

function sectionOf(name: string | RegExp): HTMLElement {
  const section = screen.getByRole('heading', { name }).closest('section');
  if (!section) throw new Error('section not found');
  return section;
}

afterEach(() => {
  window.localStorage.clear();
});

describe('resolveLinks', () => {
  it('skips unknown and duplicate slugs and respects the limit', () => {
    const links = resolveLinks(['rut', 'nope', 'cpf', 'rut', 'cnpj'], 'es', '/tletelieru/', 2);
    expect(links).toEqual([
      { slug: 'rut', name: 'RUT (Chile)', href: '/tletelieru/es/tools/ids/rut/' },
      { slug: 'cpf', name: 'CPF (Brasil)', href: '/tletelieru/es/tools/ids/cpf/' },
    ]);
  });
});

describe('isCurrentPath', () => {
  it('ignores trailing slashes, query and hash', () => {
    expect(isCurrentPath('/t/en/tools/ids/rut/', '/t/en/tools/ids/rut')).toBe(true);
    expect(isCurrentPath('/t/en/tools/ids/rut/?a=1', '/t/en/tools/ids/rut/')).toBe(true);
    expect(isCurrentPath('/t/en/tools/ids/rut/', '/t/en/tools/ids/cpf/')).toBe(false);
  });
});

describe('FavoriteButton', () => {
  it('toggles and persists the favorite', () => {
    render(<FavoriteButton slug="rut" />);
    const button = screen.getByRole('button', { name: 'Add to favorites' });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(button);
    const active = screen.getByRole('button', { name: 'Remove from favorites' });
    expect(active).toHaveAttribute('aria-pressed', 'true');
    expect(JSON.parse(window.localStorage.getItem(favoritesStore.key) ?? '[]')).toEqual(['rut']);

    fireEvent.click(active);
    expect(screen.getByRole('button', { name: 'Add to favorites' })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(favoritesStore.key) ?? '[]')).toEqual([]);
  });

  it('reads an existing favorite and speaks Spanish', () => {
    seed(['cpf'], []);
    render(
      <LocaleProvider locale="es">
        <FavoriteButton slug="cpf" />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Quitar de favoritos' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('SidebarShortcuts', () => {
  it('renders nothing when there are no favorites or recent tools', () => {
    seed([], ['unknown-tool']);
    render(<SidebarShortcuts locale="en" />);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('lists favorites and recent tools with localized names and hrefs', () => {
    seed(['cpf', 'ghost'], ['rut', 'cpf']);
    window.history.replaceState(null, '', '/en/tools/ids/rut/');
    render(<SidebarShortcuts locale="en" />);

    const favorites = within(sectionOf('Favorites'));
    expect(favorites.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'CPF (Brazil)',
    ]);
    expect(favorites.getByRole('link', { name: 'CPF (Brazil)' })).toHaveAttribute(
      'href',
      '/en/tools/ids/cpf/',
    );

    const recent = within(sectionOf(/Recent/));
    const rut = recent.getByRole('link', { name: 'RUT (Chile)' });
    expect(rut).toHaveAttribute('href', '/en/tools/ids/rut/');
    expect(rut).toHaveAttribute('aria-current', 'page');
    expect(recent.getByRole('link', { name: 'CPF (Brazil)' })).not.toHaveAttribute('aria-current');
  });

  it('caps each section at eight entries', () => {
    const slugs = [
      'rut',
      'cpf',
      'cnpj',
      'national-id',
      'sql-in-text',
      'sql-in-numbers',
      'sql-like',
      'sql-json',
      'sql-list',
      'timezone',
      'unix',
      'case',
      'json',
      'html',
    ];
    seed(slugs, []);
    render(<SidebarShortcuts />);
    expect(screen.getAllByRole('link')).toHaveLength(8);
  });

  it('clears the recent list', () => {
    seed([], ['rut']);
    render(<SidebarShortcuts locale="en" />);
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Clear recent' }));
    });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(recentStore.key)).toBe('[]');
  });

  it('uses Spanish labels, names and hrefs', () => {
    seed(['cpf'], ['rut']);
    render(<SidebarShortcuts locale="es" />);
    expect(screen.getByRole('navigation', { name: 'Herramientas favoritas y recientes' }));
    expect(screen.getByRole('heading', { name: 'Favoritos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'CPF (Brasil)' })).toHaveAttribute(
      'href',
      '/es/tools/ids/cpf/',
    );
    expect(screen.getByRole('button', { name: 'Borrar recientes' })).toBeInTheDocument();
  });
});
