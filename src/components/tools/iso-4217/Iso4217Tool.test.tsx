import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import { currencies } from '~/lib/tools/iso-4217';
import Iso4217Tool from './Iso4217Tool';

function output(): HTMLTextAreaElement {
  return screen.getByLabelText('Output') as HTMLTextAreaElement;
}

describe('Iso4217Tool', () => {
  it('lists every currency before searching', () => {
    render(<Iso4217Tool />);
    const table = screen.getByRole('table', { name: 'ISO 4217 currencies' });
    expect(within(table).getAllByRole('row')).toHaveLength(currencies.length + 1);
  });

  it('filters by code and exposes copyable text', () => {
    render(<Iso4217Tool />);
    fireEvent.change(screen.getByLabelText('Search (code, number, name or country)'), {
      target: { value: 'kwd' },
    });
    expect(output().value).toContain('KWD');
    expect(output().value).toContain('Kuwaiti Dinar');
    expect(screen.getByText(`1 of ${currencies.length}`)).toBeInTheDocument();
  });

  it('finds countries by their localized name', () => {
    render(
      <LocaleProvider locale="es">
        <Iso4217Tool />
      </LocaleProvider>,
    );
    fireEvent.change(screen.getByLabelText('Buscar (código, número, nombre o país)'), {
      target: { value: 'alemania' },
    });
    expect((screen.getByLabelText('Resultado') as HTMLTextAreaElement).value).toContain('EUR');
  });

  it('reports an empty search', () => {
    render(<Iso4217Tool />);
    fireEvent.change(screen.getByLabelText('Search (code, number, name or country)'), {
      target: { value: 'zzzz' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('No currency matches');
  });

  it('previews the result of the input placeholder', () => {
    render(<Iso4217Tool />);
    expect(output().placeholder).toContain('Chilean Peso');
  });
});
