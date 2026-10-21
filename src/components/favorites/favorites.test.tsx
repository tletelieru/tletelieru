import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import { favoritesStore } from '~/lib/user-data/favorites';
import { FavoriteButton } from './FavoriteButton';

afterEach(() => {
  window.localStorage.clear();
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
    window.localStorage.setItem(favoritesStore.key, JSON.stringify(['cpf']));
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
