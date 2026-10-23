import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import HtmlEntitiesTool from './HtmlEntitiesTool';

function outputValue(label = 'Output'): string {
  return (screen.getByLabelText(label) as HTMLTextAreaElement).value;
}

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('HtmlEntitiesTool', () => {
  it('encodes the minimal set by default', async () => {
    render(<HtmlEntitiesTool />);
    await userEvent.click(screen.getByLabelText('Text to encode'));
    await userEvent.paste('<b>Café & "té"</b>');
    expect(outputValue()).toBe('&lt;b&gt;Café &amp; &quot;té&quot;&lt;/b&gt;');
  });

  it('encodes non-ASCII as named or numeric entities', async () => {
    window.history.replaceState(null, '', '/?input=caf%C3%A9%20%F0%9F%98%80');
    render(<HtmlEntitiesTool />);
    await userEvent.click(screen.getByRole('button', { name: 'Also non-ASCII' }));
    expect(outputValue()).toBe('caf&eacute; &#128512;');
    await userEvent.click(screen.getByRole('button', { name: 'Hex' }));
    expect(outputValue()).toBe('caf&#xE9; &#x1F600;');
  });

  it('decodes from the URL and lists warnings with positions', () => {
    window.history.replaceState(
      null,
      '',
      `/?mode=decode&input=${encodeURIComponent('caf&eacute; &foo;\n&copy 2024')}`,
    );
    render(<HtmlEntitiesTool />);
    expect(outputValue()).toBe('café &foo;\n© 2024');
    expect(screen.getByText('2 entities decoded')).toBeInTheDocument();
    expect(screen.getByText('2 warnings')).toBeInTheDocument();
    expect(
      screen.getByText('&foo;: unknown entity, kept as is (line 1, column 13)'),
    ).toBeInTheDocument();
    expect(screen.getByText('&copy: missing “;” (line 2, column 1)')).toBeInTheDocument();
  });

  it('renders in Spanish inside a Spanish locale', () => {
    window.history.replaceState(null, '', '/?mode=decode&input=%26bar%3B%20%26amp%3B');
    render(
      <LocaleProvider locale="es">
        <HtmlEntitiesTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Decodificar' })).toBeInTheDocument();
    expect(outputValue('Resultado')).toBe('&bar; &');
    expect(screen.getByText('1 entidad decodificada')).toBeInTheDocument();
    expect(
      screen.getByText('&bar;: entidad desconocida, se mantiene igual (línea 1, columna 1)'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeInTheDocument();
  });
});

describe('HtmlEntitiesTool output placeholder', () => {
  it('previews the result of the input placeholder', () => {
    render(<HtmlEntitiesTool />);
    const placeholder = screen.getByLabelText('Output').getAttribute('placeholder');
    expect(placeholder).toContain('&lt;p&gt;Caf');
  });
});
