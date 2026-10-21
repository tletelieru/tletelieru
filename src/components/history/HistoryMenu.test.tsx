import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import { addHistory, historyStore } from '~/lib/user-data/history';
import { HistoryMenu } from './HistoryMenu';

describe('HistoryMenu', () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders nothing without entries', () => {
    const { container } = render(<HistoryMenu slug="rut" onSelect={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists entries for the slug and selects one', async () => {
    const user = userEvent.setup();
    const now = Date.now();
    act(() => {
      addHistory('rut', '12.345.678-5', now - 5 * 60_000);
      addHistory('rut', 'first line\nsecond line', now - 1_000);
      addHistory('cpf', 'other tool', now);
    });
    const onSelect = vi.fn();
    render(<HistoryMenu slug="rut" onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: 'History (2 entries)' }));
    const items = screen.getAllByRole('menuitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('first line second line');
    expect(items[0]).toHaveTextContent('now');
    expect(items[1]).toHaveTextContent('12.345.678-5');
    expect(items[1]).toHaveTextContent('5 minutes ago');
    expect(screen.queryByText('other tool')).not.toBeInTheDocument();

    await user.click(items[1] as HTMLElement);
    expect(onSelect).toHaveBeenCalledWith('12.345.678-5');
  });

  it('clears the history for the slug', async () => {
    const user = userEvent.setup();
    act(() => {
      addHistory('rut', 'a');
      addHistory('cpf', 'b');
    });
    render(<HistoryMenu slug="rut" onSelect={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /History/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Clear history' }));

    await waitFor(() => expect(screen.queryByRole('button', { name: /History/ })).toBeNull());
    expect(historyStore.get()).toEqual({ cpf: [expect.objectContaining({ value: 'b' })] });
  });

  it('renders in Spanish', async () => {
    const user = userEvent.setup();
    const now = Date.now();
    act(() => addHistory('rut', 'a', now - 5 * 60_000));
    render(
      <LocaleProvider locale="es">
        <HistoryMenu slug="rut" onSelect={vi.fn()} />
      </LocaleProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Historial (1 entrada)' }));
    expect(screen.getByText('hace 5 minutos')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Borrar historial' })).toBeInTheDocument();
  });
});
