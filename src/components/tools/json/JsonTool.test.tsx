import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import JsonTool from './JsonTool';

function outputValue(): string {
  return (screen.getByLabelText('Output') as HTMLTextAreaElement).value;
}

describe('JsonTool', () => {
  it('formats the input and shows stats', () => {
    render(<JsonTool />);
    fireEvent.change(screen.getByLabelText('JSON'), { target: { value: '{"a":[1,2]}' } });
    expect(outputValue()).toBe('{\n  "a": [\n    1,\n    2\n  ]\n}');
    expect(screen.getByText('11 B → 29 B · depth 2 · 1 key')).toBeInTheDocument();
  });

  it('shows the error position and an excerpt', () => {
    render(<JsonTool />);
    fireEvent.change(screen.getByLabelText('JSON'), { target: { value: '{\n  "a": 1,\n}' } });
    expect(screen.getByRole('alert')).toHaveTextContent(
      "Line 2, column 9: Trailing comma before '}' is not allowed",
    );
    expect(outputValue()).toBe('2 |   "a": 1,\n  |         ^');
  });

  it('hydrates mode and options from the URL', () => {
    window.history.replaceState(
      null,
      '',
      `/?mode=minify&sortKeys=1&input=${encodeURIComponent('{"b": 1.0, "a": [3, 1]}')}`,
    );
    render(<JsonTool />);
    expect(outputValue()).toBe('{"a":[3,1],"b":1.0}');
  });

  it('switches to validate mode', async () => {
    window.history.replaceState(null, '', `/?input=${encodeURIComponent('[1]')}`);
    render(<JsonTool />);
    await userEvent.click(screen.getByRole('button', { name: 'Validate' }));
    expect(outputValue()).toBe('✔ Valid JSON');
    expect(screen.queryByLabelText('Sort keys')).not.toBeInTheDocument();
  });

  it('formats with tabs', async () => {
    window.history.replaceState(null, '', `/?input=${encodeURIComponent('{"a":1}')}`);
    render(<JsonTool />);
    await userEvent.click(screen.getByRole('button', { name: 'Tab' }));
    expect(outputValue()).toBe('{\n\t"a": 1\n}');
  });

  it('renders in Spanish and translates errors', () => {
    window.history.replaceState(null, '', `/?input=${encodeURIComponent('{"a": 1,}')}`);
    render(
      <LocaleProvider locale="es">
        <JsonTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Formatear' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2 espacios' })).toBeInTheDocument();
    expect(screen.getByLabelText('Ordenar claves')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      "Línea 1, columna 8: No se permite una coma final antes de '}'",
    );
    expect((screen.getByLabelText('Resultado') as HTMLTextAreaElement).value).toBe(
      '1 | {"a": 1,}\n  |        ^',
    );
  });

  it('shows Spanish stats', () => {
    window.history.replaceState(null, '', `/?mode=validate&input=${encodeURIComponent('{"a":1}')}`);
    render(
      <LocaleProvider locale="es">
        <JsonTool />
      </LocaleProvider>,
    );
    expect((screen.getByLabelText('Resultado') as HTMLTextAreaElement).value).toBe('✔ JSON válido');
    expect(screen.getByText('7 B · profundidad 1 · 1 clave')).toBeInTheDocument();
  });
});
