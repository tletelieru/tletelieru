import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import HtmlTool from './HtmlTool';

function preview(): HTMLIFrameElement {
  return screen.getByTitle('Preview') as HTMLIFrameElement;
}

describe('HtmlTool', () => {
  it('renders the input in a sandboxed iframe without scripts', () => {
    render(<HtmlTool />);
    fireEvent.change(screen.getByLabelText('HTML'), { target: { value: '<p>Hello</p>' } });
    const frame = preview();
    expect(frame.getAttribute('sandbox')).toBe('');
    const doc = frame.getAttribute('srcdoc') ?? '';
    expect(doc).toContain('<body>\n<p>Hello</p>\n</body>');
    expect(doc).toContain("default-src 'none'");
    expect(doc).not.toContain('script-src');
  });

  it('allows scripts but never same-origin', async () => {
    window.history.replaceState(null, '', `/?input=${encodeURIComponent('<b>x</b>')}`);
    render(<HtmlTool />);
    await userEvent.click(screen.getByLabelText('Allow scripts'));
    const frame = preview();
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts');
    expect(frame.getAttribute('srcdoc')).toContain("script-src 'unsafe-inline'");
  });

  it('hydrates options from the URL', () => {
    window.history.replaceState(
      null,
      '',
      `/?viewport=mobile&background=dark&height=600&scripts=1&input=${encodeURIComponent('<!doctype html><html><head></head><body>hi</body></html>')}`,
    );
    render(<HtmlTool />);
    const frame = preview();
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts');
    const doc = frame.getAttribute('srcdoc') ?? '';
    expect(doc.startsWith('<!doctype html><html><head>\n<meta charset="utf-8">')).toBe(true);
    expect(doc).toContain('background: #121212');
    expect(frame).toHaveStyle({ width: '375px', height: '600px' });
  });

  it('disables copying until there is input', () => {
    render(<HtmlTool />);
    expect(screen.getByRole('button', { name: 'Copy document' })).toBeDisabled();
  });

  it('renders in Spanish', async () => {
    window.history.replaceState(null, '', `/?input=${encodeURIComponent('<p>Hola</p>')}`);
    render(
      <LocaleProvider locale="es">
        <HtmlTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Móvil 375' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Oscuro' })).toBeInTheDocument();
    expect(screen.getByText('Scripts bloqueados · red bloqueada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar documento' })).toBeEnabled();
    const frame = screen.getByTitle('Vista previa') as HTMLIFrameElement;
    expect(frame.getAttribute('sandbox')).toBe('');
    await userEvent.click(screen.getByLabelText('Permitir scripts'));
    expect(screen.getByText('Scripts permitidos · red bloqueada')).toBeInTheDocument();
    expect(screen.getByTitle('Vista previa').getAttribute('sandbox')).toBe('allow-scripts');
  });
});
