import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import { snippetsStore, type Snippet } from '~/lib/user-data/snippets';
import SnippetsPage from './SnippetsPage';

function snippet(id: string, title: string, content: string, tags: string[], updatedAt: number) {
  return { id, title, content, tags, createdAt: updatedAt, updatedAt } satisfies Snippet;
}

function seed(list: Snippet[]) {
  act(() => snippetsStore.set(list));
}

function card(title: string) {
  return screen.getByRole('article', { name: title });
}

describe('SnippetsPage', () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('shows the local-only empty state', () => {
    render(<SnippetsPage />);
    expect(screen.getByText('No snippets yet')).toBeInTheDocument();
    expect(screen.getByText(/stored only in this browser/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();
  });

  it('creates a snippet and validates required fields', async () => {
    const user = userEvent.setup();
    render(<SnippetsPage />);
    await user.click(screen.getByRole('button', { name: 'New snippet' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(within(dialog).getByText('Add a title.')).toBeInTheDocument();
    expect(within(dialog).getByText('Add some content.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText(/Title/), 'Users query');
    await user.type(within(dialog).getByLabelText(/Tags/), 'SQL, postgres');
    await user.type(within(dialog).getByLabelText(/Content/), 'select * from users');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const created = card('Users query');
    expect(within(created).getByText('select * from users')).toBeInTheDocument();
    expect(within(created).getByText('sql')).toBeInTheDocument();
    expect(snippetsStore.get()).toHaveLength(1);
    expect(snippetsStore.get()[0]?.tags).toEqual(['sql', 'postgres']);
  });

  it('searches and filters by tag', async () => {
    const user = userEvent.setup();
    seed([
      snippet('a', 'Canción list', 'select 1', ['sql'], 1),
      snippet('b', 'Login curl', 'curl -X POST', ['http'], 2),
    ]);
    render(<SnippetsPage />);
    const titles = () =>
      screen.getAllByRole('article').map((item) => within(item).getByRole('heading').textContent);
    expect(titles()).toEqual(['Login curl', 'Canción list']);

    await user.type(screen.getByLabelText('Search snippets'), 'cancion');
    expect(titles()).toEqual(['Canción list']);
    expect(screen.getByText('1 of 2 snippets')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Search snippets'));
    await user.click(screen.getByRole('button', { name: 'http' }));
    expect(titles()).toEqual(['Login curl']);

    await user.type(screen.getByLabelText('Search snippets'), 'select');
    expect(screen.getByText('No snippets match your search.')).toBeInTheDocument();
  });

  it('edits a snippet', async () => {
    const user = userEvent.setup();
    seed([snippet('a', 'Old title', 'select 1', ['sql'], 1)]);
    render(<SnippetsPage />);
    await user.click(within(card('Old title')).getByRole('button', { name: 'Edit' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Edit snippet')).toBeInTheDocument();
    const title = within(dialog).getByLabelText(/Title/);
    await user.clear(title);
    await user.type(title, 'New title');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(card('New title')).toBeInTheDocument();
    expect(screen.getByText('1 snippet')).toBeInTheDocument();
    expect(snippetsStore.get()[0]).toMatchObject({ id: 'a', title: 'New title', tags: ['sql'] });
  });

  it('deletes a snippet after confirming', async () => {
    const user = userEvent.setup();
    seed([snippet('a', 'Keep', 'x', [], 1), snippet('b', 'Drop', 'y', [], 2)]);
    render(<SnippetsPage />);
    await user.click(within(card('Drop')).getByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByText('“Drop” will be removed from this browser.'),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(snippetsStore.get().map((item) => item.id)).toEqual(['a']);
    expect(screen.queryByRole('article', { name: 'Drop' })).not.toBeInTheDocument();
  });

  it('exports all snippets as a JSON download', async () => {
    const user = userEvent.setup();
    seed([snippet('a', 'One', 'x', [], 1)]);
    const createObjectURL = vi.fn((blob: Blob) => (blob.size > 0 ? 'blob:snippets' : ''));
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<SnippetsPage />);
    await user.click(screen.getByRole('button', { name: 'Export' }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(blob.type).toBe('application/json');
    const payload = JSON.parse(await blob.text()) as { snippets: Snippet[] };
    expect(payload.snippets.map((item) => item.id)).toEqual(['a']);
    expect(click).toHaveBeenCalledTimes(1);
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toMatch(/^snippets-.*\.json$/);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:snippets');
  });

  it('imports a file merging by id', async () => {
    seed([snippet('a', 'Local newer', 'x', [], 10)]);
    render(<SnippetsPage />);
    const file = new File(
      [
        JSON.stringify({
          version: 1,
          snippets: [
            snippet('a', 'Stale', 'x', [], 5),
            snippet('b', 'Imported', 'y', ['sql'], 20),
            { id: 'broken' },
          ],
        }),
      ],
      'snippets.json',
      { type: 'application/json' },
    );
    fireEvent.change(screen.getByLabelText('Import'), { target: { files: [file] } });

    expect(await screen.findByText('Imported 1 snippet, skipped 2.')).toBeInTheDocument();
    expect(snippetsStore.get().map((item) => [item.id, item.title])).toEqual([
      ['b', 'Imported'],
      ['a', 'Local newer'],
    ]);
    expect(card('Imported')).toBeInTheDocument();
  });

  it('reports an invalid import file', async () => {
    render(<SnippetsPage />);
    const file = new File(['{nope'], 'bad.json', { type: 'application/json' });
    fireEvent.change(screen.getByLabelText('Import'), { target: { files: [file] } });
    expect(
      await screen.findByText('That file is not a valid snippets export.'),
    ).toBeInTheDocument();
  });

  it('renders in Spanish', async () => {
    const user = userEvent.setup();
    seed([snippet('a', 'Consulta', 'select 1', ['sql'], 1)]);
    render(
      <LocaleProvider locale="es">
        <SnippetsPage />
      </LocaleProvider>,
    );
    expect(screen.getByLabelText('Buscar snippets')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nuevo snippet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Todos' })).toBeInTheDocument();
    const item = card('Consulta');
    expect(within(item).getByRole('button', { name: 'Copiar' })).toBeInTheDocument();
    await user.click(within(item).getByRole('button', { name: 'Eliminar' }));
    expect(screen.getByText('¿Eliminar snippet?')).toBeInTheDocument();
  });

  it('shows the Spanish empty state', () => {
    render(
      <LocaleProvider locale="es">
        <SnippetsPage />
      </LocaleProvider>,
    );
    expect(screen.getByText('Aún no hay snippets')).toBeInTheDocument();
    expect(screen.getByText(/solo en este navegador/)).toBeInTheDocument();
  });
});
