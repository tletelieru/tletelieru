import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import BankStatementTool from './BankStatementTool';

function output(): HTMLTextAreaElement {
  return screen.getByLabelText('Output', { selector: 'textarea' }) as HTMLTextAreaElement;
}

describe('BankStatementTool', () => {
  it('normalizes a statement and reports what it detected', () => {
    render(<BankStatementTool />);
    fireEvent.change(screen.getByLabelText('Bank statement (CSV)'), {
      target: { value: 'Fecha;Glosa;Cargo;Abono;Saldo\n31/01/2026;Pago;1.000;;5.000,50' },
    });
    expect(output().value).toBe(
      'date,description,debit,credit,balance\n2026-01-31,Pago,1000,,5000.50',
    );
    expect(screen.getByText('1 row · 1.234,56 · DD/MM/YYYY')).toBeInTheDocument();
  });

  it('switches to JSON', async () => {
    render(<BankStatementTool />);
    await userEvent.click(screen.getByRole('button', { name: 'JSON' }));
    fireEvent.change(screen.getByLabelText('Bank statement (CSV)'), {
      target: { value: 'date,amount\n2026-01-15,-5.50' },
    });
    expect(JSON.parse(output().value)).toEqual([
      { date: '2026-01-15', description: '', debit: '5.50', credit: '', balance: '' },
    ]);
  });

  it('maps columns by hand', async () => {
    render(<BankStatementTool />);
    fireEvent.change(screen.getByLabelText('Bank statement (CSV)'), {
      target: { value: 'x,y\n2026-01-15,5' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('No date column');
    await userEvent.click(screen.getByRole('combobox', { name: 'Date' }));
    await userEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'x' }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Debit' }));
    await userEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'y' }));
    expect(output().value).toContain('2026-01-15,,5,,');
  });

  it('previews the result of the input placeholder', () => {
    render(<BankStatementTool />);
    expect(output().placeholder).toContain('2026-01-15,Compra supermercado,12345,,987655');
  });

  it('renders in Spanish', () => {
    render(
      <LocaleProvider locale="es">
        <BankStatementTool />
      </LocaleProvider>,
    );
    expect(screen.getByLabelText('Cartola bancaria (CSV)')).toBeInTheDocument();
  });
});
