import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import NamesTool from './NamesTool';

function outputValue(label: string): string {
  return (screen.getByLabelText(label) as HTMLTextAreaElement).value;
}

describe('NamesTool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/');
  });

  it('formats a single name and lists every format and part', async () => {
    render(<NamesTool />);
    await userEvent.type(
      screen.getByLabelText('Names, one per line'),
      'JOSÉ MIGUEL CARRERA VERDUGO',
    );

    expect(outputValue('Output (Name case)')).toBe('José Miguel Carrera Verdugo');
    const formats = screen.getByRole('list', { name: 'All formats' });
    expect(within(formats).getAllByRole('listitem')).toHaveLength(4);
    expect(within(formats).getByText('JOSÉ MIGUEL CARRERA VERDUGO')).toBeInTheDocument();
    expect(within(formats).getByText('josé miguel carrera verdugo')).toBeInTheDocument();

    const parts = screen.getByRole('list', { name: 'Name parts' });
    expect(within(parts).getAllByRole('listitem')).toHaveLength(6);
    const row = within(parts).getByText('Second surname').closest('li');
    if (!row) throw new Error('row not found');
    expect(within(row).getByText('Verdugo')).toBeInTheDocument();
  });

  it('copies a single part from the list', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    window.history.replaceState(null, '', '/?input=juan+de+la+fuente+rojas');
    render(<NamesTool />);

    const parts = screen.getByRole('list', { name: 'Name parts' });
    const row = within(parts).getByText('First surname').closest('li');
    if (!row) throw new Error('row not found');
    await act(async () => {
      fireEvent.click(within(row).getByRole('button', { name: 'Copy' }));
    });
    expect(writeText).toHaveBeenCalledWith('de la Fuente');
  });

  it('hydrates multi-line input, format and normalizer from the URL', () => {
    window.history.replaceState(
      null,
      '',
      '/?format=upper&preset=ascii&input=Mar%C3%ADa+Jos%C3%A9+Mu%C3%B1oz%0Abernardo+o%27higgins',
    );
    render(<NamesTool />);
    expect(outputValue('Output (UPPER CASE)')).toBe('MARIA JOSE MUNOZ\nBERNARDO OHIGGINS');
    expect(screen.queryByRole('list', { name: 'All formats' })).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Name parts' })).not.toBeInTheDocument();
    const accents = screen.getByRole('switch', { name: 'Remove accents' });
    expect(accents).toBeChecked();
    expect(accents).toBeDisabled();
  });

  it('applies the Ñ rule and the split strategy', () => {
    window.history.replaceState(
      null,
      '',
      '/?enye=ni&strategy=particle&input=juan+de+la+fuente+mu%C3%B1oz',
    );
    render(<NamesTool />);
    expect(outputValue('Output (Name case)')).toBe('Juan de la Fuente Munioz');
    const parts = screen.getByRole('list', { name: 'Name parts' });
    const row = within(parts).getByText('Given names').closest('li');
    if (!row) throw new Error('row not found');
    expect(within(row).getByText('Juan de la Fuente')).toBeInTheDocument();
  });

  it('renders in Spanish inside a Spanish locale', () => {
    window.history.replaceState(
      null,
      '',
      '/?input=MAR%C3%8DA+DE+LOS+%C3%81NGELES+MATUS+DE+LA+PARRA',
    );
    render(
      <LocaleProvider locale="es">
        <NamesTool />
      </LocaleProvider>,
    );
    expect(screen.getByLabelText('Nombres, uno por línea')).toHaveValue(
      'MARÍA DE LOS ÁNGELES MATUS DE LA PARRA',
    );
    expect(screen.getByLabelText('Estrategia de separación')).toBeInTheDocument();
    expect(screen.getByText('Quitar tildes')).toBeInTheDocument();
    expect(outputValue('Resultado (Nombre propio)')).toBe('María de los Ángeles Matus de la Parra');
    const formats = screen.getByRole('list', { name: 'Todos los formatos' });
    expect(within(formats).getByText('MAYÚSCULAS')).toBeInTheDocument();
    const parts = screen.getByRole('list', { name: 'Partes del nombre' });
    expect(within(parts).getByText('Primer apellido')).toBeInTheDocument();
    expect(within(parts).getAllByRole('button', { name: 'Copiar' })).toHaveLength(6);
  });
});

describe('NamesTool output placeholder', () => {
  it('previews the result of the input placeholder', () => {
    render(<NamesTool />);
    const placeholder = screen.getByLabelText('Output (Name case)').getAttribute('placeholder');
    expect(placeholder).toContain('María de los Ángeles Matus de la Parra');
    expect(placeholder).toContain('Juan de la Fuente Rojas');
  });
});
