import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import SqlJsonTool from './SqlJsonTool';

function output(): string {
  return (screen.getByLabelText('Output') as HTMLTextAreaElement).value;
}

describe('SqlJsonTool', () => {
  it('builds a Postgres ->> IN query by default', () => {
    render(<SqlJsonTool />);
    fireEvent.change(screen.getByLabelText('Values'), { target: { value: 'a\nb' } });
    expect(output()).toBe("meta_data->>'reference' IN ('a', 'b')");
  });

  it('switches dialect and operation', async () => {
    render(<SqlJsonTool />);
    fireEvent.change(screen.getByLabelText('Values'), { target: { value: 'a' } });
    await userEvent.click(screen.getByRole('button', { name: 'MySQL (JSON)' }));
    expect(output()).toBe("meta_data->>'$.reference' = 'a'");
    await userEvent.click(screen.getByRole('button', { name: 'JSON_CONTAINS' }));
    expect(output()).toBe(`JSON_CONTAINS(meta_data, '"a"', '$.reference')`);
  });

  it('validates the key path', () => {
    render(<SqlJsonTool />);
    fireEvent.change(screen.getByLabelText('Key path'), { target: { value: 'a..b' } });
    fireEvent.change(screen.getByLabelText('Values'), { target: { value: 'x' } });
    expect(
      screen.getByText('Invalid key path: a..b (use dot notation like nested.key)'),
    ).toBeInTheDocument();
  });

  it('hydrates options from the URL', () => {
    window.history.replaceState(null, '', '/?input=x&path=nested.key&op=contains&column=data');
    render(<SqlJsonTool />);
    expect(output()).toBe(`data @> '{"nested": {"key": "x"}}'`);
  });

  it('renders in Spanish inside a Spanish locale', () => {
    window.history.replaceState(null, '', '/?input=x&path=a..b');
    render(
      <LocaleProvider locale="es">
        <SqlJsonTool />
      </LocaleProvider>,
    );
    expect(screen.getByLabelText('Ruta de la clave')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '@> contención' })).toBeInTheDocument();
    expect(
      screen.getByText('Ruta de clave inválida: a..b (usa notación con puntos, como nested.key)'),
    ).toBeInTheDocument();
  });
});

describe('SqlJsonTool output placeholder', () => {
  it('previews the result of the input placeholder', () => {
    render(<SqlJsonTool />);
    const placeholder = screen.getByLabelText('Output').getAttribute('placeholder');
    expect(placeholder).toContain('meta_data');
    expect(placeholder).toContain('ref-001');
  });
});
