import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import SqlInNumbersTool from './SqlInNumbersTool';

function output(): string {
  return (screen.getByLabelText('Output') as HTMLTextAreaElement).value;
}

describe('SqlInNumbersTool', () => {
  it('builds an IN list and flags invalid values', async () => {
    render(<SqlInNumbersTool />);
    await userEvent.type(screen.getByLabelText('Numbers'), '3{enter}abc{enter}-1.5');
    expect(output()).toBe('IN (3, -1.5)');
    expect(screen.getByText('Skipped 1 invalid value: "abc"')).toBeInTheDocument();
  });

  it('sorts when toggled', async () => {
    render(<SqlInNumbersTool />);
    fireEvent.change(screen.getByLabelText('Numbers'), { target: { value: '3\n1\n2' } });
    await userEvent.click(screen.getByLabelText('Sort ascending'));
    expect(output()).toBe('IN (1, 2, 3)');
  });

  it('hides quote options', () => {
    render(<SqlInNumbersTool />);
    expect(screen.queryByLabelText('Quote style')).not.toBeInTheDocument();
  });

  it('hydrates options from the URL', () => {
    window.history.replaceState(null, '', '/?input=1%0A2%0A3&column=id&not=1&layout=multi&batch=2');
    render(<SqlInNumbersTool />);
    expect(output()).toBe('(\n  id NOT IN (\n    1,\n    2\n  )\n  AND id NOT IN (\n    3\n  )\n)');
  });

  it('renders in Spanish inside a Spanish locale', () => {
    window.history.replaceState(null, '', '/?input=1%0Aabc%0Ax');
    render(
      <LocaleProvider locale="es">
        <SqlInNumbersTool />
      </LocaleProvider>,
    );
    expect(screen.getByLabelText('Números')).toBeInTheDocument();
    expect(screen.getByLabelText('Ordenar ascendente')).toBeInTheDocument();
    expect(screen.getByText('Se omitieron 2 valores inválidos: "abc", "x"')).toBeInTheDocument();
    expect((screen.getByLabelText('Resultado') as HTMLTextAreaElement).value).toBe('IN (1)');
  });
});

describe('SqlInNumbersTool output placeholder', () => {
  it('previews the result of the input placeholder', () => {
    render(<SqlInNumbersTool />);
    const placeholder = screen.getByLabelText('Output').getAttribute('placeholder');
    expect(placeholder).toContain('user_id IN (1, 2, 3.5, -4)');
  });
});
