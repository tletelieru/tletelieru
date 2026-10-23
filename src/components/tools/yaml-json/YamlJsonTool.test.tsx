import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import YamlJsonTool from './YamlJsonTool';

function output(label = 'Output'): string {
  return (screen.getByLabelText(label) as HTMLTextAreaElement).value;
}

describe('YamlJsonTool', () => {
  it('converts YAML to JSON', () => {
    render(<YamlJsonTool />);
    fireEvent.change(screen.getByLabelText('YAML'), { target: { value: 'a: 1\nb: [x]' } });
    expect(output()).toBe('{\n  "a": 1,\n  "b": [\n    "x"\n  ]\n}');
  });

  it('converts JSON to YAML with 4 spaces', async () => {
    render(<YamlJsonTool />);
    await userEvent.click(screen.getByRole('button', { name: 'JSON → YAML' }));
    await userEvent.click(screen.getByRole('button', { name: '4 spaces' }));
    fireEvent.change(screen.getByLabelText('JSON'), { target: { value: '{"a":{"b":1}}' } });
    expect(output()).toBe('a:\n    b: 1\n');
  });

  it('reports YAML errors with line and excerpt', () => {
    render(<YamlJsonTool />);
    fireEvent.change(screen.getByLabelText('YAML'), { target: { value: 'a: 1\na: 2' } });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Line 2, column 1: Map keys must be unique',
    );
    expect(output()).toBe('2 | a: 2\n  | ^');
  });

  it('counts several documents', () => {
    window.history.replaceState(null, '', `/?input=${encodeURIComponent('a: 1\n---\nb: 2')}`);
    render(<YamlJsonTool />);
    expect(screen.getByText('2 documents')).toBeInTheDocument();
  });

  it('reports JSON errors', () => {
    window.history.replaceState(null, '', `/?mode=json2yaml&input=${encodeURIComponent('[1,]')}`);
    render(<YamlJsonTool />);
    expect(screen.getByRole('alert')).toHaveTextContent('Line 1, column 3');
  });

  it('renders in Spanish and translates YAML errors', () => {
    window.history.replaceState(null, '', `/?input=${encodeURIComponent('a: 1\na: 2')}`);
    render(
      <LocaleProvider locale="es">
        <YamlJsonTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: '2 espacios' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Línea 2, columna 1: Las claves de un mapa deben ser únicas',
    );
  });
});

describe('YamlJsonTool output placeholder', () => {
  it('previews the conversion of the placeholder', async () => {
    render(<YamlJsonTool />);
    const placeholder = () => screen.getByLabelText('Output').getAttribute('placeholder');
    expect(placeholder()).toContain('"features": [\n    "pwa",');
    await userEvent.click(screen.getByRole('button', { name: 'JSON → YAML' }));
    expect(placeholder()).toBe(
      'name: tletelieru\nfeatures:\n  - pwa\n  - i18n\nowner:\n  remote: true\n',
    );
  });
});
