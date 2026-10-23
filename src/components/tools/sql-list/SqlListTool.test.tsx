import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import SqlListTool from './SqlListTool';

function output(): string {
  return (screen.getByLabelText('Output') as HTMLTextAreaElement).value;
}

describe('SqlListTool', () => {
  it('formats values in parentheses by default', () => {
    render(<SqlListTool />);
    fireEvent.change(screen.getByLabelText('Values'), { target: { value: "a\nO'Brien" } });
    expect(output()).toBe("('a', 'O''Brien')");
  });

  it('switches the wrapper', async () => {
    render(<SqlListTool />);
    fireEvent.change(screen.getByLabelText('Values'), { target: { value: 'a\nb' } });
    await userEvent.click(screen.getByRole('combobox', { name: 'Wrapper' }));
    await userEvent.click(within(screen.getByRole('listbox')).getByText("VALUES ('a'), ('b')"));
    expect(output()).toBe("VALUES ('a'), ('b')");
  });

  it('hydrates options from the URL', () => {
    window.history.replaceState(null, '', '/?input=1%0A2&wrap=any&column=id&quote=none');
    render(<SqlListTool />);
    expect(output()).toBe('id = ANY(ARRAY[1, 2])');
  });

  it('renders in Spanish inside a Spanish locale', () => {
    window.history.replaceState(null, '', '/?input=a%0Ab');
    render(
      <LocaleProvider locale="es">
        <SqlListTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('combobox', { name: 'Envoltura' })).toHaveTextContent(
      "Paréntesis ('a', 'b')",
    );
    expect(screen.getByRole('button', { name: 'Pegar' })).toBeInTheDocument();
    expect((screen.getByLabelText('Resultado') as HTMLTextAreaElement).value).toBe("('a', 'b')");
  });
});

describe('SqlListTool output placeholder', () => {
  it('previews the result of the input placeholder', () => {
    render(<SqlListTool />);
    const placeholder = screen.getByLabelText('Output').getAttribute('placeholder');
    expect(placeholder).toContain("'a', 'b', 'c'");
  });
});
