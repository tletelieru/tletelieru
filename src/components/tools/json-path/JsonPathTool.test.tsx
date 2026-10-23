import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import JsonPathTool from './JsonPathTool';

function output(label = 'Output'): string {
  return (screen.getByLabelText(label) as HTMLTextAreaElement).value;
}

const json = '{"a":[{"id":1},{"id":2}]}';

describe('JsonPathTool', () => {
  it('lists matched values, paths and pointers', async () => {
    render(<JsonPathTool />);
    fireEvent.change(screen.getByLabelText('JSON'), { target: { value: json } });
    fireEvent.change(screen.getByLabelText('JSONPath'), { target: { value: '$.a[*].id' } });
    expect(output()).toBe('[\n  1,\n  2\n]');
    expect(screen.getByText('2 matches')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Paths' }));
    expect(output()).toBe("$['a'][0]['id']\n$['a'][1]['id']");
    await userEvent.click(screen.getByRole('button', { name: 'JSON Pointers' }));
    expect(output()).toBe('/a/0/id\n/a/1/id');
  });

  it('asks for a path', () => {
    render(<JsonPathTool />);
    fireEvent.change(screen.getByLabelText('JSON'), { target: { value: json } });
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a JSONPath expression');
  });

  it('reports invalid paths and JSON', () => {
    window.history.replaceState(null, '', `/?path=a.b&input=${encodeURIComponent(json)}`);
    render(<JsonPathTool />);
    expect(screen.getByRole('alert')).toHaveTextContent('The path must start with $');
  });

  it('reports invalid JSON with an excerpt', () => {
    window.history.replaceState(null, '', `/?path=%24&input=${encodeURIComponent('{"a":')}`);
    render(<JsonPathTool />);
    expect(screen.getByRole('alert')).toHaveTextContent('Line 1, column 6');
    expect(output()).toBe('1 | {"a":\n  |      ^');
  });

  it('renders in Spanish', () => {
    window.history.replaceState(null, '', `/?path=%24.a%5B0&input=${encodeURIComponent(json)}`);
    render(
      <LocaleProvider locale="es">
        <JsonPathTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Rutas' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent("'[' en la posición 4 nunca se cierra");
  });
});

describe('JsonPathTool output placeholder', () => {
  it('previews the placeholder query', async () => {
    render(<JsonPathTool />);
    const placeholder = () => screen.getByLabelText('Output').getAttribute('placeholder');
    expect(placeholder()).toBe('[\n  "Sayings",\n  "Moby Dick"\n]');
    await userEvent.click(screen.getByRole('button', { name: 'Paths' }));
    expect(placeholder()).toBe("$['store']['book'][0]['title']\n$['store']['book'][2]['title']");
  });
});
