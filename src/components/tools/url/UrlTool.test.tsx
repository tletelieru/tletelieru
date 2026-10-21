import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import UrlTool from './UrlTool';

function outputValue(label = 'Output'): string {
  return (screen.getByLabelText(label) as HTMLTextAreaElement).value;
}

describe('UrlTool', () => {
  it('encodes a component', async () => {
    render(<UrlTool />);
    await userEvent.type(screen.getByLabelText('Text to encode'), 'a b&c=ñ');
    expect(outputValue()).toBe('a%20b%26c%3D%C3%B1');
  });

  it('hydrates decode mode with form encoding from the URL', () => {
    window.history.replaceState(null, '', '/?mode=decode&form=1&input=a+b%252Bc%2526');
    render(<UrlTool />);
    expect(outputValue()).toBe('a b+c&');
  });

  it('reports invalid percent-escapes with their position', () => {
    window.history.replaceState(null, '', '/?mode=decode&input=abc%25zz');
    render(<UrlTool />);
    expect(screen.getByText('Invalid percent-escape at position 4.')).toBeInTheDocument();
  });

  it('hydrates parse mode from the URL and lists params in order', () => {
    const url = 'https://example.com:8443/p?tag=a&q=hola%20mundo&tag=b#top';
    window.history.replaceState(null, '', `/?mode=parse&input=${encodeURIComponent(url)}`);
    render(<UrlTool />);
    const parts = within(screen.getByRole('table', { name: 'URL parts' }));
    expect(parts.getByText('example.com')).toBeInTheDocument();
    expect(parts.getByText('8443')).toBeInTheDocument();
    expect(parts.getByText('#top')).toBeInTheDocument();
    const rows = within(screen.getByRole('table', { name: 'Query parameters' })).getAllByRole(
      'row',
    );
    expect(rows.slice(1).map((row) => row.textContent)).toEqual([
      '1tagatag=a',
      '2qhola mundoq=hola%20mundo',
      '3tagbtag=b',
    ]);
    expect(screen.getByText('3 parameters')).toBeInTheDocument();
    expect(JSON.parse(outputValue()).params).toEqual([
      { key: 'tag', value: 'a' },
      { key: 'q', value: 'hola mundo' },
      { key: 'tag', value: 'b' },
    ]);
  });

  it('builds a query string from rows', async () => {
    window.history.replaceState(null, '', '/?mode=build');
    render(<UrlTool />);
    await userEvent.type(screen.getByLabelText('Base URL (optional)'), 'https://x.cl/s#top');
    await userEvent.type(screen.getByLabelText('Key'), 'q');
    await userEvent.type(screen.getByLabelText('Value'), 'a b');
    await userEvent.click(screen.getByRole('button', { name: 'Add parameter' }));
    const keys = screen.getAllByLabelText('Key');
    const values = screen.getAllByLabelText('Value');
    await userEvent.type(keys[1], 'tag');
    await userEvent.type(values[1], 'ñ');
    expect(outputValue()).toBe('https://x.cl/s?q=a%20b&tag=%C3%B1#top');
    await userEvent.click(screen.getByRole('button', { name: 'Remove parameter 1' }));
    expect(outputValue()).toBe('https://x.cl/s?tag=%C3%B1#top');
  });

  it('hydrates build rows from the URL', () => {
    window.history.replaceState(
      null,
      '',
      `/?mode=build&form=1&rows=${encodeURIComponent(
        JSON.stringify([
          ['a', '1 2'],
          ['b', ''],
        ]),
      )}`,
    );
    render(<UrlTool />);
    expect(outputValue()).toBe('a=1+2&b=');
  });

  it('renders in Spanish inside a Spanish locale', () => {
    window.history.replaceState(null, '', '/?mode=parse&input=a%3D1%26b%3D%25G1');
    render(
      <LocaleProvider locale="es">
        <UrlTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Analizar' })).toBeInTheDocument();
    expect(screen.getByText('2 parámetros')).toBeInTheDocument();
    expect(
      screen.getByText('b: Secuencia de escape porcentual inválida en la posición 7.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('URL o query string')).toHaveValue('a=1&b=%G1');
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeInTheDocument();
  });
});
