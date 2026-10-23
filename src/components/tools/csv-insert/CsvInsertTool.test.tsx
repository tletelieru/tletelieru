import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import CsvInsertTool from './CsvInsertTool';

function output(label = 'Output'): string {
  return (screen.getByLabelText(label) as HTMLTextAreaElement).value;
}

describe('CsvInsertTool', () => {
  it('requires a table name', () => {
    render(<CsvInsertTool />);
    fireEvent.change(screen.getByLabelText('CSV'), { target: { value: 'a\n1' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Table name is required.');
  });

  it('builds a multi-row INSERT', async () => {
    render(<CsvInsertTool />);
    await userEvent.type(screen.getByLabelText('Table'), 'users');
    fireEvent.change(screen.getByLabelText('CSV'), {
      target: { value: "id,name\n1,O'Brien\n2," },
    });
    expect(output()).toBe("INSERT INTO users (id, name) VALUES\n  (1, 'O''Brien'),\n  (2, NULL);");
    expect(screen.getByText('2 rows')).toBeInTheDocument();
  });

  it('switches to one INSERT per row and lowercase keywords', async () => {
    window.history.replaceState(null, '', `/?table=t&input=${encodeURIComponent('a\n1\n2')}`);
    render(<CsvInsertTool />);
    await userEvent.click(screen.getByRole('button', { name: 'One INSERT per row' }));
    await userEvent.click(screen.getByLabelText('Uppercase keywords'));
    expect(output()).toBe('insert into t (a) values (1);\ninsert into t (a) values (2);');
    expect(screen.queryByLabelText('Rows per INSERT (0 = all)')).not.toBeInTheDocument();
  });

  it('hydrates options from the URL', () => {
    window.history.replaceState(
      null,
      '',
      `/?table=t&infer=0&nullEmpty=0&ident=backtick&quote=double&input=${encodeURIComponent('a b\n1')}`,
    );
    render(<CsvInsertTool />);
    expect(output()).toBe('INSERT INTO t (`a b`) VALUES\n  ("1");');
  });

  it('reports ragged rows', () => {
    window.history.replaceState(null, '', `/?table=t&input=${encodeURIComponent('a,b\n1')}`);
    render(<CsvInsertTool />);
    expect(screen.getByRole('alert')).toHaveTextContent('line 2');
  });

  it('renders in Spanish', () => {
    window.history.replaceState(null, '', `/?table=bad%20name&input=a`);
    render(
      <LocaleProvider locale="es">
        <CsvInsertTool />
      </LocaleProvider>,
    );
    expect(screen.getByLabelText('Tabla')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Un INSERT por fila' })).toBeInTheDocument();
    expect(screen.getByLabelText('Celdas vacías como NULL')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Nombre de tabla inválido: bad name');
    expect(output('Resultado')).toBe('');
  });
});

describe('CsvInsertTool output placeholder', () => {
  it('previews the INSERT for the placeholder CSV', () => {
    render(<CsvInsertTool />);
    expect(screen.getByLabelText('Output').getAttribute('placeholder')).toBe(
      [
        'INSERT INTO users (id, name, email, active) VALUES',
        "  (1, 'Ana', 'ana@example.com', TRUE),",
        "  (2, 'O''Brien', NULL, FALSE);",
      ].join('\n'),
    );
  });
});
