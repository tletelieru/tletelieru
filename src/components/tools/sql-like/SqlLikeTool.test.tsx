import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import SqlLikeTool from './SqlLikeTool';

function output(): string {
  return (screen.getByLabelText('Output') as HTMLTextAreaElement).value;
}

describe('SqlLikeTool', () => {
  it('asks for a column, then builds the LIKE chain', async () => {
    render(<SqlLikeTool />);
    fireEvent.change(screen.getByLabelText('Values'), { target: { value: 'a\nb' } });
    expect(screen.getByText('Column name is required.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Column'), 'name');
    expect(output()).toBe("(name LIKE '%a%' OR name LIKE '%b%')");
  });

  it('switches match mode and joiner', async () => {
    render(<SqlLikeTool />);
    fireEvent.change(screen.getByLabelText('Column'), { target: { value: 'c' } });
    fireEvent.change(screen.getByLabelText('Values'), { target: { value: 'a\nb' } });
    await userEvent.click(screen.getByRole('button', { name: 'Starts v%' }));
    await userEvent.click(screen.getByRole('button', { name: 'AND' }));
    expect(output()).toBe("(c LIKE 'a%' AND c LIKE 'b%')");
  });

  it('hydrates options from the URL', () => {
    window.history.replaceState(
      null,
      '',
      '/?input=a_b&column=email&match=exact&not=1&ilike=1&wild=1',
    );
    render(<SqlLikeTool />);
    expect(output()).toBe("email NOT ILIKE 'a!_b' ESCAPE '!'");
  });

  it('renders in Spanish inside a Spanish locale', () => {
    window.history.replaceState(null, '', '/?input=a');
    render(
      <LocaleProvider locale="es">
        <SqlLikeTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Contiene %v%' })).toBeInTheDocument();
    expect(screen.getByLabelText('Escapar % y _')).toBeInTheDocument();
    expect(screen.getByText('El nombre de la columna es obligatorio.')).toBeInTheDocument();
  });
});
