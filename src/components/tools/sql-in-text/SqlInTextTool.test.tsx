import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import SqlInTextTool from './SqlInTextTool';

function output(): string {
  return (screen.getByLabelText('Output') as HTMLTextAreaElement).value;
}

describe('SqlInTextTool', () => {
  it('turns values into an IN clause and shows stats', async () => {
    render(<SqlInTextTool />);
    await userEvent.type(screen.getByLabelText('Values'), "a{enter}O'Brien{enter}a");
    expect(output()).toBe("IN ('a', 'O''Brien')");
    expect(screen.getByText('3 values · 2 unique · 1 duplicates removed')).toBeInTheDocument();
  });

  it('applies the column and NOT IN toggle', async () => {
    render(<SqlInTextTool />);
    fireEvent.change(screen.getByLabelText('Values'), { target: { value: 'x\ny' } });
    await userEvent.type(screen.getByLabelText('Column (optional)'), 'ref');
    await userEvent.click(screen.getByLabelText('NOT IN'));
    expect(output()).toBe("ref NOT IN ('x', 'y')");
  });

  it('shows an error for an invalid column', () => {
    window.history.replaceState(null, '', '/?input=a&column=bad%20name');
    render(<SqlInTextTool />);
    expect(screen.getByText('Invalid column name: bad name')).toBeInTheDocument();
    expect(output()).toBe('');
  });

  it('hydrates options from the URL', () => {
    window.history.replaceState(
      null,
      '',
      '/?input=a%0Ab%0Ac&column=id&batch=2&quote=double&upper=0',
    );
    render(<SqlInTextTool />);
    expect(output()).toBe('(id in ("a", "b") or id in ("c"))');
  });

  it('renders in Spanish inside a Spanish locale', () => {
    window.history.replaceState(null, '', '/?input=a%0Ab%0Aa&column=bad%20name');
    render(
      <LocaleProvider locale="es">
        <SqlInTextTool />
      </LocaleProvider>,
    );
    expect(screen.getByLabelText('Valores')).toBeInTheDocument();
    expect(screen.getByLabelText('Columna (opcional)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Uno por línea' })).toBeInTheDocument();
    expect(screen.getByText('Nombre de columna inválido: bad name')).toBeInTheDocument();
    expect(screen.getByText('3 valores · 2 únicos · 1 duplicados eliminados')).toBeInTheDocument();
  });
});

describe('SqlInTextTool output placeholder', () => {
  it('previews the result of the input placeholder', () => {
    render(<SqlInTextTool />);
    const placeholder = screen.getByLabelText('Output').getAttribute('placeholder');
    expect(placeholder).toContain("transaction_id IN ('txn_ab8fcd54");
  });
});
