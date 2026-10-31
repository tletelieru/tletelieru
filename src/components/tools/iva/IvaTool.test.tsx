import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import IvaTool from './IvaTool';

function output(): HTMLTextAreaElement {
  return screen.getByLabelText('Output') as HTMLTextAreaElement;
}

describe('IvaTool', () => {
  it('breaks down a factura', () => {
    render(<IvaTool />);
    fireEvent.change(screen.getByLabelText('Net amounts (one per line)'), {
      target: { value: '10000' },
    });
    expect(output().value).toContain('│ 1     │ 10000 │ 1900 │ 11900 │');
    expect(output().value).toContain('│ Total │ 10000 │ 1900 │ 11900 │');
  });

  it('breaks down a boleta', async () => {
    render(<IvaTool />);
    await userEvent.click(screen.getByRole('button', { name: 'Boleta: total → net' }));
    fireEvent.change(screen.getByLabelText('Gross amounts (one per line)'), {
      target: { value: '1000' },
    });
    expect(output().value).toContain('│ 1     │ 840 │ 160 │  1000 │');
  });

  it('rejects a bad rate', () => {
    render(<IvaTool />);
    fireEvent.change(screen.getByLabelText('Rate %'), { target: { value: 'x' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a rate');
  });

  it('previews the result of the input placeholder', () => {
    render(<IvaTool />);
    expect(output().placeholder).toContain('│ Total │ 37490 │ 7123 │ 44613 │');
  });

  it('renders in Spanish', () => {
    render(
      <LocaleProvider locale="es">
        <IvaTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Factura: neto → total' })).toBeInTheDocument();
    expect((screen.getByLabelText('Resultado') as HTMLTextAreaElement).placeholder).toContain(
      'Neto',
    );
  });
});
