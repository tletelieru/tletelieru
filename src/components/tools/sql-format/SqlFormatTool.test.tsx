import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import SqlFormatTool from './SqlFormatTool';

function output(label = 'Output'): string {
  return (screen.getByLabelText(label) as HTMLTextAreaElement).value;
}

describe('SqlFormatTool', () => {
  it('formats SQL with uppercase keywords', () => {
    render(<SqlFormatTool />);
    fireEvent.change(screen.getByLabelText('SQL'), { target: { value: 'select a, b from t' } });
    expect(output()).toBe('SELECT\n  a,\n  b\nFROM\n  t');
  });

  it('switches keyword case, indent and minify', async () => {
    render(<SqlFormatTool />);
    fireEvent.change(screen.getByLabelText('SQL'), { target: { value: 'SELECT a FROM t' } });
    await userEvent.click(screen.getByRole('button', { name: 'lower' }));
    await userEvent.click(screen.getByRole('button', { name: '4 spaces' }));
    expect(output()).toBe('select\n    a\nfrom\n    t');
    await userEvent.click(screen.getByLabelText('Minify (one line, no comments)'));
    expect(output()).toBe('select a from t');
    expect(screen.queryByRole('button', { name: '4 spaces' })).not.toBeInTheDocument();
  });

  it('shows parse errors', () => {
    render(<SqlFormatTool />);
    fireEvent.change(screen.getByLabelText('SQL'), { target: { value: 'select (a from' } });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Line 1, column 15: could not parse the SQL here.',
    );
    expect(output()).toBe('');
  });

  it('hydrates options from the URL', () => {
    window.history.replaceState(
      null,
      '',
      `/?dialect=postgresql&minify=1&input=${encodeURIComponent("select x->>'k' from t")}`,
    );
    render(<SqlFormatTool />);
    expect(output()).toBe("SELECT x ->> 'k' FROM t");
  });

  it('renders in Spanish', () => {
    window.history.replaceState(null, '', `/?input=${encodeURIComponent('select (')}`);
    render(
      <LocaleProvider locale="es">
        <SqlFormatTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'SQL estándar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mantener' })).toBeInTheDocument();
    expect(screen.getByLabelText('Minificar (una línea, sin comentarios)')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('no se pudo interpretar el SQL');
    expect(output('Resultado')).toBe('');
  });
});

describe('SqlFormatTool output placeholder', () => {
  it('previews the formatted placeholder query', () => {
    render(<SqlFormatTool />);
    const placeholder = screen.getByLabelText('Output').getAttribute('placeholder');
    expect(placeholder).toContain('SELECT\n  u.id,');
    expect(placeholder).toContain('LEFT JOIN orders o ON o.user_id = u.id');
  });

  it('follows the options', async () => {
    render(<SqlFormatTool />);
    await userEvent.click(screen.getByLabelText('Minify (one line, no comments)'));
    expect(screen.getByLabelText('Output').getAttribute('placeholder')).toMatch(
      /^SELECT u\.id, u\.name, COUNT\(o\.id\) AS orders FROM users u/,
    );
  });
});
