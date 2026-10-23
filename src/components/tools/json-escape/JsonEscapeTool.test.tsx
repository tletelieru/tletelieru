import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import JsonEscapeTool from './JsonEscapeTool';

function outputValue(label = 'Output'): string {
  return (screen.getByLabelText(label) as HTMLTextAreaElement).value;
}

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('JsonEscapeTool', () => {
  it('escapes text and applies the options', async () => {
    render(<JsonEscapeTool />);
    await userEvent.click(screen.getByLabelText('Raw text'));
    await userEvent.paste('say "hé"\n');
    expect(outputValue()).toBe('say \\"hé\\"\\n');
    await userEvent.click(screen.getByRole('switch', { name: 'Wrap in quotes' }));
    await userEvent.click(screen.getByRole('switch', { name: 'Escape non-ASCII as \\uXXXX' }));
    expect(outputValue()).toBe('"say \\"h\\u00e9\\"\\n"');
  });

  it('unescapes and pretty-prints embedded JSON on demand', async () => {
    window.history.replaceState(
      null,
      '',
      `/?mode=unescape&input=${encodeURIComponent('"{\\"a\\":1}"')}`,
    );
    render(<JsonEscapeTool />);
    expect(outputValue()).toBe('{"a":1}');
    expect(screen.getByText('2 escapes')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Pretty-print embedded JSON' }));
    expect(outputValue()).toBe('{\n  "a": 1\n}');
    await userEvent.click(screen.getByRole('button', { name: 'Show raw text' }));
    expect(outputValue()).toBe('{"a":1}');
  });

  it('hides the pretty-print button for plain text', () => {
    window.history.replaceState(null, '', '/?mode=unescape&input=a%5Cnb');
    render(<JsonEscapeTool />);
    expect(outputValue()).toBe('a\nb');
    expect(screen.queryByRole('button', { name: 'Pretty-print embedded JSON' })).toBeNull();
  });

  it('shows the position of a bad escape', () => {
    window.history.replaceState(null, '', `/?mode=unescape&input=${encodeURIComponent('ab\\x')}`);
    render(<JsonEscapeTool />);
    expect(screen.getByText('Invalid escape \\x at line 1, column 3.')).toBeInTheDocument();
    expect(outputValue()).toBe('');
  });

  it('renders in Spanish inside a Spanish locale', () => {
    window.history.replaceState(
      null,
      '',
      `/?mode=unescape&input=${encodeURIComponent('x\\ud83d')}`,
    );
    render(
      <LocaleProvider locale="es">
        <JsonEscapeTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Desescapar' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Surrogate suelto \\ud83d en línea 1, columna 2: un surrogate alto debe ir seguido de uno bajo.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Resultado')).toBeInTheDocument();
  });
});

describe('JsonEscapeTool output placeholder', () => {
  it('previews the result of the input placeholder', () => {
    render(<JsonEscapeTool />);
    const placeholder = screen.getByLabelText('Output').getAttribute('placeholder');
    expect(placeholder).toContain('Line 1');
    expect(placeholder).toContain('quoted');
  });
});
