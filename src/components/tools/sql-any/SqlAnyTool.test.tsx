import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import SqlAnyTool from './SqlAnyTool';

function output(label = 'Output'): string {
  return (screen.getByLabelText(label) as HTMLTextAreaElement).value;
}

describe('SqlAnyTool', () => {
  it('builds = ANY(ARRAY[...]) for text values', async () => {
    render(<SqlAnyTool />);
    await userEvent.type(screen.getByLabelText('Column (optional)'), 'code');
    fireEvent.change(screen.getByLabelText('Values'), { target: { value: "a\nO'b\na" } });
    expect(output()).toBe("code = ANY(ARRAY['a', 'O''b'])");
    expect(screen.getByText('3 values · 2 unique · 1 duplicates removed')).toBeInTheDocument();
  });

  it('switches to a typed array literal and NOT', async () => {
    render(<SqlAnyTool />);
    fireEvent.change(screen.getByLabelText('Values'), { target: { value: '1\n2' } });
    await userEvent.click(screen.getByRole('button', { name: 'bigint' }));
    await userEvent.click(screen.getByRole('button', { name: "'{…}'::bigint[]" }));
    await userEvent.click(screen.getByLabelText('NOT (<> ALL)'));
    expect(output()).toBe("<> ALL('{1,2}'::bigint[])");
  });

  it('reports values that do not match the type', () => {
    window.history.replaceState(null, '', '/?type=uuid&column=id&input=nope');
    render(<SqlAnyTool />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Skipped 1 value that are not valid uuid: "nope"',
    );
  });

  it('hydrates options from the URL', () => {
    window.history.replaceState(null, '', '/?type=int&column=id&batch=2&input=1%0A2%0A3');
    render(<SqlAnyTool />);
    expect(output()).toBe('(id = ANY(ARRAY[1, 2]) OR id = ANY(ARRAY[3]))');
  });

  it('renders in Spanish', () => {
    window.history.replaceState(null, '', '/?type=int&input=x');
    render(
      <LocaleProvider locale="es">
        <SqlAnyTool />
      </LocaleProvider>,
    );
    expect(screen.getByLabelText('Columna (opcional)')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Tipo de elemento' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Se omitieron 1 valor que no es int válido: "x"',
    );
  });
});

describe('SqlAnyTool output placeholder', () => {
  it('previews the placeholder values for the current type', async () => {
    render(<SqlAnyTool />);
    expect(screen.getByLabelText('Output').getAttribute('placeholder')).toBe(
      "status = ANY(ARRAY['pending', 'processing', 'failed'])",
    );
    await userEvent.click(screen.getByRole('button', { name: 'int' }));
    expect(screen.getByLabelText('Output').getAttribute('placeholder')).toBe(
      'status = ANY(ARRAY[101, 102, 103])',
    );
  });
});
