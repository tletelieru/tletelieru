import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import NumberLocaleTool from './NumberLocaleTool';

function output(): HTMLTextAreaElement {
  return screen.getByLabelText('Output') as HTMLTextAreaElement;
}

describe('NumberLocaleTool', () => {
  it('formats for the chosen locale', () => {
    render(<NumberLocaleTool />);
    fireEvent.change(screen.getByLabelText('Numbers (one per line, dot for decimals)'), {
      target: { value: '1234.56' },
    });
    expect(output().value).toBe('1.234,56');
  });

  it('parses a localized number back', async () => {
    render(<NumberLocaleTool />);
    await userEvent.click(screen.getByRole('button', { name: 'Parse' }));
    fireEvent.change(screen.getByLabelText('Localized numbers (one per line)'), {
      target: { value: '1.234,56' },
    });
    expect(output().value).toBe('1234.56');
  });

  it('shows the currency picker only for the currency style', async () => {
    render(<NumberLocaleTool />);
    expect(screen.queryByLabelText('Currency')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Currency' }));
    expect(screen.getByRole('combobox', { name: 'Currency' })).toBeInTheDocument();
  });

  it('reports invalid lines', () => {
    render(<NumberLocaleTool />);
    fireEvent.change(screen.getByLabelText('Numbers (one per line, dot for decimals)'), {
      target: { value: 'abc' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Line 1');
  });

  it('previews the result of the input placeholder', () => {
    render(<NumberLocaleTool />);
    expect(output().placeholder).toBe('1.234.567,891');
  });

  it('renders in Spanish', () => {
    render(
      <LocaleProvider locale="es">
        <NumberLocaleTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Formatear' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Porcentaje' })).toBeInTheDocument();
  });
});
