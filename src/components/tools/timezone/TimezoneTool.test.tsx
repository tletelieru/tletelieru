import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import TimezoneTool from './TimezoneTool';

function outputValue(): string {
  return (screen.getByLabelText('Output') as HTMLTextAreaElement).value;
}

describe('TimezoneTool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('converts a Santiago time to UTC by default', async () => {
    render(<TimezoneTool />);
    await userEvent.type(screen.getByLabelText('Date and time'), '2026-01-15 09:30');
    expect(outputValue()).toBe(
      [
        'America/Santiago  2026-01-15 09:30:00  -03:00  -    DST',
        'UTC               2026-01-15 12:30:00  +00:00  UTC  standard',
      ].join('\n'),
    );
  });

  it('hydrates source, targets and input from the URL', () => {
    window.history.replaceState(
      null,
      '',
      '/?input=2026-03-01+00%3A00&from=Asia%2FKolkata&to=UTC%2CAmerica%2FSantiago',
    );
    render(<TimezoneTool />);
    expect(screen.getByLabelText('From')).toHaveValue('Asia/Kolkata');
    expect(
      outputValue()
        .split('\n')
        .map((line) => line.split(/\s{2,}/).slice(0, 3)),
    ).toEqual([
      ['Asia/Kolkata', '2026-03-01 00:00:00', '+05:30'],
      ['UTC', '2026-02-28 18:30:00', '+00:00'],
      ['America/Santiago', '2026-02-28 15:30:00', '-03:00'],
    ]);
  });

  it('swaps source and first target keeping the instant', async () => {
    window.history.replaceState(null, '', '/?input=2026-01-15+09%3A30');
    render(<TimezoneTool />);
    await userEvent.click(screen.getByRole('button', { name: 'Swap' }));
    expect(screen.getByLabelText('From')).toHaveValue('UTC');
    expect(screen.getByLabelText('Date and time')).toHaveValue('2026-01-15 12:30:00');
    expect(outputValue().split('\n')[1]).toContain('America/Santiago  2026-01-15 09:30:00');
  });

  it('warns about ambiguous times and rejects skipped ones', async () => {
    window.history.replaceState(null, '', '/?input=2026-04-04+23%3A30');
    const { unmount } = render(<TimezoneTool />);
    expect(screen.getByText(/happens twice/)).toBeInTheDocument();
    expect(outputValue()).toContain('Earlier (-03:00)');
    expect(outputValue()).toContain('Later (-04:00)');
    unmount();

    window.history.replaceState(null, '', '/?input=2026-09-06+00%3A30');
    render(<TimezoneTool />);
    expect(screen.getByText(/does not exist in America\/Santiago/)).toBeInTheDocument();
    expect(outputValue()).toBe('');
  });

  it('fills the current time in the source zone', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 9, 20, 15, 4, 5));
    render(<TimezoneTool />);
    await userEvent.click(screen.getByRole('button', { name: 'Now' }));
    expect(screen.getByLabelText('Date and time')).toHaveValue('2026-10-20 12:04:05');
  });

  it('renders in Spanish inside a Spanish locale', () => {
    window.history.replaceState(null, '', '/?input=2026-04-04+23%3A30');
    const { unmount } = render(
      <LocaleProvider locale="es">
        <TimezoneTool />
      </LocaleProvider>,
    );
    expect(screen.getByLabelText('Desde')).toHaveValue('America/Santiago');
    expect(screen.getByRole('button', { name: 'Invertir' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ahora' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeInTheDocument();
    expect(screen.getByText(/ocurre dos veces en America\/Santiago/)).toBeInTheDocument();
    const output = (screen.getByLabelText('Resultado') as HTMLTextAreaElement).value;
    expect(output).toContain('Primera (-03:00)');
    expect(output).toContain('Segunda (-04:00)');
    expect(output).toContain('horario de verano');
    unmount();

    window.history.replaceState(null, '', '/?input=2026-09-06+00%3A30');
    render(
      <LocaleProvider locale="es">
        <TimezoneTool />
      </LocaleProvider>,
    );
    expect(
      screen.getByText(
        '2026-09-06 00:30:00 no existe en America/Santiago: a las 2026-09-06 00:00 (-04:00) los relojes se adelantan a las 01:00 (-03:00). ¿Quisiste decir 2026-09-06 01:30:00 (-03:00)?',
      ),
    ).toBeInTheDocument();
  });
});
