import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import SmartPastePanel from './SmartPastePanel';

const assign = vi.fn();

afterEach(() => {
  assign.mockReset();
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
});

describe('SmartPastePanel', () => {
  it('shows the empty state first', () => {
    render(<SmartPastePanel />);
    expect(
      screen.getByText('Paste or type something to see which tools can handle it.'),
    ).toBeInTheDocument();
  });

  it('lists detected tools ordered by confidence with prefilled links', async () => {
    render(<SmartPastePanel />);
    await userEvent.click(screen.getByLabelText('Paste anything'));
    await userEvent.paste('12.345.678-5');
    const open = await screen.findByRole('link', { name: 'Open RUT (Chile)' });
    expect(open).toHaveAttribute('href', '/en/tools/ids/rut/?input=12.345.678-5&mode=validate');
    expect(screen.getByText('Best match')).toBeInTheDocument();
    expect(screen.getByText('95% match')).toBeInTheDocument();
  });

  it('orders multiple matches', async () => {
    render(<SmartPastePanel />);
    await userEvent.click(screen.getByLabelText('Paste anything'));
    await userEvent.paste('1700000000\n1700000500');
    const links = await screen.findAllByRole('link');
    expect(links[0]).toHaveAccessibleName('Open Unix timestamp converter');
    expect(links.length).toBeGreaterThan(1);
  });

  it('shows the no-match state for prose', async () => {
    render(<SmartPastePanel />);
    await userEvent.type(screen.getByLabelText('Paste anything'), 'hello there');
    expect(await screen.findByText(/No tool recognized this input/)).toBeInTheDocument();
  });

  it('renders Spanish strings', async () => {
    render(
      <LocaleProvider locale="es">
        <SmartPastePanel />
      </LocaleProvider>,
    );
    await userEvent.click(screen.getByLabelText('Pega cualquier cosa'));
    await userEvent.paste('{"a": 1}');
    expect(await screen.findByText('1 herramienta compatible')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir Formateador JSON' })).toHaveAttribute(
      'href',
      '/es/tools/data/json/?input=%7B%22a%22%3A+1%7D',
    );
  });

  it('hands large input off through sessionStorage', async () => {
    vi.stubGlobal('location', { ...window.location, assign });
    const big = JSON.stringify({ data: 'x'.repeat(5000) });
    render(<SmartPastePanel />);
    fireEvent.change(screen.getByLabelText('Paste anything'), { target: { value: big } });
    const open = await screen.findByRole('link', { name: 'Open JSON prettier' });
    expect(open).toHaveAttribute('href', '/en/tools/data/json/?handoff=1');
    await userEvent.click(open);
    expect(assign).toHaveBeenCalledWith('/en/tools/data/json/?handoff=1');
    expect(JSON.parse(window.sessionStorage.getItem('tl:handoff') ?? '{}')).toEqual({ input: big });
  });

  it('lets small links navigate natively', async () => {
    vi.stubGlobal('location', { ...window.location, assign });
    render(<SmartPastePanel />);
    await userEvent.click(screen.getByLabelText('Paste anything'));
    await userEvent.paste('12.345.678-5');
    const open = await screen.findByRole('link', { name: 'Open RUT (Chile)' });
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    open.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(assign).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem('tl:handoff')).toBeNull();
  });
});
