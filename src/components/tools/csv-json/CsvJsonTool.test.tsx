import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import CsvJsonTool from './CsvJsonTool';

function output(label = 'Output'): string {
  return (screen.getByLabelText(label) as HTMLTextAreaElement).value;
}

describe('CsvJsonTool', () => {
  it('converts CSV to typed JSON and shows stats', () => {
    render(<CsvJsonTool />);
    fireEvent.change(screen.getByLabelText('CSV'), {
      target: { value: 'id;name\n1;"a; b"' },
    });
    expect(output()).toBe('[\n  {\n    "id": 1,\n    "name": "a; b"\n  }\n]');
    expect(screen.getByText('1 row · 2 columns')).toBeInTheDocument();
  });

  it('turns off inference and pretty printing', async () => {
    render(<CsvJsonTool />);
    fireEvent.change(screen.getByLabelText('CSV'), { target: { value: 'a\n1' } });
    await userEvent.click(screen.getByLabelText('Infer types (numbers, booleans, null)'));
    await userEvent.click(screen.getByLabelText('Pretty print'));
    expect(output()).toBe('[{"a":"1"}]');
  });

  it('converts JSON to CSV with the chosen delimiter', async () => {
    render(<CsvJsonTool />);
    await userEvent.click(screen.getByRole('button', { name: 'JSON → CSV' }));
    expect(screen.queryByRole('button', { name: 'Auto' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Semicolon' }));
    fireEvent.change(screen.getByLabelText('JSON'), {
      target: { value: '[{"a":1,"b":"x;y"}]' },
    });
    expect(output()).toBe('a;b\n1;"x;y"');
  });

  it('shows CSV errors', () => {
    render(<CsvJsonTool />);
    fireEvent.change(screen.getByLabelText('CSV'), { target: { value: 'a\n"open' } });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Line 2: the quoted field that starts here is never closed',
    );
  });

  it('shows JSON errors with an excerpt', () => {
    window.history.replaceState(null, '', `/?mode=json2csv&input=${encodeURIComponent('[1,]')}`);
    render(<CsvJsonTool />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      "Line 1, column 3: Trailing comma before ']'",
    );
    expect(output()).toBe('1 | [1,]\n  |   ^');
  });

  it('rejects JSON that is not tabular', () => {
    window.history.replaceState(null, '', `/?mode=json2csv&input=${encodeURIComponent('"x"')}`);
    render(<CsvJsonTool />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'JSON must be an object, an array of objects or an array of arrays.',
    );
  });

  it('renders in Spanish', () => {
    window.history.replaceState(null, '', `/?input=${encodeURIComponent('a,b\n1,2\n3,4')}`);
    render(
      <LocaleProvider locale="es">
        <CsvJsonTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Punto y coma' })).toBeInTheDocument();
    expect(screen.getByLabelText('La primera fila es el encabezado')).toBeInTheDocument();
    expect(screen.getByLabelText('Formato legible')).toBeInTheDocument();
    expect(screen.getByText('2 filas · 2 columnas')).toBeInTheDocument();
    expect(output('Resultado')).toContain('"a": 1');
  });
});

describe('CsvJsonTool output placeholder', () => {
  it('previews the conversion of the input placeholder', () => {
    render(<CsvJsonTool />);
    expect(screen.getByLabelText('Output').getAttribute('placeholder')).toContain(
      '"name": "Smith, John"',
    );
  });

  it('follows the direction', async () => {
    render(<CsvJsonTool />);
    await userEvent.click(screen.getByRole('button', { name: 'JSON → CSV' }));
    expect(screen.getByLabelText('Output').getAttribute('placeholder')).toBe(
      'id,name,active\n1,Ana,true\n2,"Smith, John",',
    );
  });
});
