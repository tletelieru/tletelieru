import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import UnixTool from './UnixTool';

const NOW = Date.UTC(2026, 9, 20, 12, 0, 0);

function outputValue(label = 'Output'): string {
  return (screen.getByLabelText(label) as HTMLTextAreaElement).value;
}

describe('UnixTool', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('converts a timestamp into every format', async () => {
    render(<UnixTool />);
    await userEvent.type(screen.getByLabelText('Timestamps or dates, one per line'), '1700000000');
    expect(outputValue()).toBe(
      [
        '1700000000  (seconds)',
        '  Seconds        1700000000',
        '  Milliseconds   1700000000000',
        '  ISO 8601 UTC   2023-11-14T22:13:20.000Z',
        '  ISO 8601 zone  2023-11-14T19:13:20-03:00  America/Santiago',
        '  RFC 2822       Tue, 14 Nov 2023 19:13:20 -0300',
        '  Relative       3 years ago',
        '  Day of week    Tuesday',
      ].join('\n'),
    );
    expect(screen.getByText('1 / 1 parsed')).toBeInTheDocument();
  });

  it('hydrates a batch with a single field from the URL', () => {
    window.history.replaceState(
      null,
      '',
      '/?field=seconds&input=1700000000123%0A2023-11-14T22%3A13%3A20Z%0Anope',
    );
    render(<UnixTool />);
    expect(outputValue()).toBe(
      ['1700000000', '1700000000', 'nope  ✘ not a timestamp or a date'].join('\n'),
    );
    expect(screen.getByText('2 / 3 parsed')).toBeInTheDocument();
  });

  it('respects the zone and forced unit from the URL', () => {
    window.history.replaceState(null, '', '/?field=isoZone&zone=Asia%2FKolkata&unit=ms&input=0');
    render(<UnixTool />);
    expect(outputValue()).toBe('1970-01-01T05:30:00+05:30');
  });

  it('fills the current timestamp', async () => {
    window.history.replaceState(null, '', '/?field=relative');
    render(<UnixTool />);
    await userEvent.click(screen.getByRole('button', { name: 'Now' }));
    expect(screen.getByLabelText('Timestamps or dates, one per line')).toHaveValue(
      String(NOW / 1000),
    );
    expect(outputValue()).toBe('now');
  });

  it('pastes from the clipboard', async () => {
    const readText = vi.fn().mockResolvedValue('0');
    Object.defineProperty(navigator, 'clipboard', { value: { readText }, configurable: true });
    window.history.replaceState(null, '', '/?field=isoUtc');
    render(<UnixTool />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Paste' }));
    });
    expect(outputValue()).toBe('1970-01-01T00:00:00.000Z');
  });

  it('renders in Spanish inside a Spanish locale', () => {
    window.history.replaceState(null, '', '/?input=1700000000%0Anope');
    render(
      <LocaleProvider locale="es">
        <UnixTool />
      </LocaleProvider>,
    );
    expect(screen.getByLabelText('Timestamps o fechas, uno por línea')).toHaveValue(
      '1700000000\nnope',
    );
    expect(screen.getByRole('button', { name: 'Ahora' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pegar' })).toBeInTheDocument();
    expect(screen.getByText('1 / 2 reconocidos')).toBeInTheDocument();
    const output = outputValue('Resultado');
    expect(output).toContain('1700000000  (segundos)');
    expect(output).toContain('Relativo          hace 3 años');
    expect(output).toContain('Día de la semana  martes');
    expect(output).toContain('RFC 2822          Tue, 14 Nov 2023 19:13:20 -0300');
    expect(output).toContain('nope  ✘ no es un timestamp ni una fecha');
  });
});
