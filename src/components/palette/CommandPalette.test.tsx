import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { favoritesStore } from '~/lib/user-data/favorites';
import { snippetsStore } from '~/lib/user-data/snippets';
import CommandPalette from './CommandPalette';
import { closePalette } from './paletteStore';

const assign = vi.fn();

beforeEach(() => {
  window.localStorage.clear();
  favoritesStore.set([]);
  snippetsStore.set([]);
  vi.stubGlobal('location', { ...window.location, assign });
});

afterEach(() => {
  act(() => closePalette());
  assign.mockReset();
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
});

async function openWithShortcut() {
  await userEvent.keyboard('{Control>}k{/Control}');
  return screen.findByRole('combobox', { name: 'Search' });
}

describe('CommandPalette', () => {
  it('renders the trigger with a shortcut hint', () => {
    render(<CommandPalette />);
    const trigger = screen.getByRole('button', { name: 'Search tools' });
    expect(trigger).toHaveTextContent('Search');
    expect(trigger).toHaveTextContent('Ctrl K');
  });

  it('opens with Ctrl+K and shows popular tools for an empty query', async () => {
    render(<CommandPalette />);
    await openWithShortcut();
    expect(screen.getByText('Popular tools')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /All tools/ })).toBeInTheDocument();
  });

  it('opens with the trigger and with /', async () => {
    render(<CommandPalette />);
    await userEvent.keyboard('/');
    expect(await screen.findByRole('combobox', { name: 'Search' })).toBeInTheDocument();
  });

  it('filters tools and navigates to the first result with Enter', async () => {
    render(<CommandPalette />);
    const field = await openWithShortcut();
    await userEvent.type(field, 'cpf');
    await waitFor(() => expect(screen.getAllByRole('option')[0]).toHaveTextContent('CPF (Brazil)'));
    expect(screen.queryByText('Popular tools')).not.toBeInTheDocument();
    await userEvent.keyboard('{Enter}');
    expect(assign).toHaveBeenCalledWith('/en/tools/ids/cpf/');
  });

  it('moves the selection with the arrow keys', async () => {
    render(<CommandPalette />);
    const field = await openWithShortcut();
    await userEvent.type(field, 'sql');
    await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(2));
    await userEvent.keyboard('{ArrowDown}');
    const options = screen.getAllByRole('option');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    expect(screen.getAllByRole('option').at(-1)).toHaveAttribute('aria-selected', 'true');
  });

  it('shows the RUT action first for a pasted RUT', async () => {
    render(<CommandPalette />);
    const field = await openWithShortcut();
    await userEvent.click(field);
    await userEvent.paste('12.345.678-5');
    await waitFor(() =>
      expect(screen.getAllByRole('option')[0]).toHaveTextContent('Open in RUT (Chile)'),
    );
    expect(screen.getByText('Detected input')).toBeInTheDocument();
    await userEvent.keyboard('{Enter}');
    expect(assign).toHaveBeenCalledWith('/en/tools/ids/rut/?input=12.345.678-5&mode=validate');
  });

  it('hands a large pasted JSON off through sessionStorage', async () => {
    const big = JSON.stringify({ data: 'x'.repeat(5000) });
    render(<CommandPalette />);
    const field = await openWithShortcut();
    fireEvent.change(field, { target: { value: big } });
    await waitFor(() =>
      expect(screen.getAllByRole('option')[0]).toHaveTextContent('Open in JSON prettier'),
    );
    await userEvent.keyboard('{Enter}');
    expect(assign).toHaveBeenCalledWith('/en/tools/data/json/?handoff=1');
    expect(JSON.parse(window.sessionStorage.getItem('tl:handoff') ?? '{}')).toEqual({ input: big });
  });

  it('marks favorites and shows the no-results state', async () => {
    favoritesStore.set(['json']);
    render(<CommandPalette />);
    const field = await openWithShortcut();
    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('JSON prettier ★');
    await userEvent.type(field, 'zzzzqqq');
    expect(await screen.findByText('No results')).toBeInTheDocument();
  });

  it('copies a snippet instead of navigating', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    snippetsStore.set([
      {
        id: 's1',
        title: 'Deploy script',
        content: 'kubectl rollout',
        tags: ['k8s'],
        createdAt: 0,
        updatedAt: 0,
      },
    ]);
    render(<CommandPalette />);
    await user.keyboard('{Control>}k{/Control}');
    const field = await screen.findByRole('combobox', { name: 'Search' });
    await user.type(field, 'deploy');
    const option = await screen.findByRole('option', { name: /Deploy script/ });
    await user.click(option);
    expect(writeText).toHaveBeenCalledWith('kubectl rollout');
    expect(await screen.findByText('Copied')).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });

  it('closes with Escape', async () => {
    render(<CommandPalette />);
    await openWithShortcut();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('combobox')).not.toBeInTheDocument());
  });

  it('renders Spanish strings', async () => {
    render(<CommandPalette locale="es" />);
    expect(screen.getByRole('button', { name: 'Buscar herramientas' })).toHaveTextContent('Buscar');
    await userEvent.keyboard('{Control>}k{/Control}');
    const field = await screen.findByRole('combobox', { name: 'Buscar' });
    expect(screen.getByText('Herramientas populares')).toBeInTheDocument();
    expect(
      screen.getByText('↑↓ para moverte · Enter para abrir · Esc para cerrar'),
    ).toBeInTheDocument();
    await userEvent.type(field, 'zona');
    await waitFor(() =>
      expect(screen.getAllByRole('option')[0]).toHaveTextContent('Conversor de zonas horarias'),
    );
  });
});
