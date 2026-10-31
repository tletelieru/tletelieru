import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import { encodeBase64Url } from '~/lib/tools/jwt';
import JwtDiffTool from './JwtDiffTool';

function token(header: object, payload: object, signature = 'c2ln'): string {
  return [
    encodeBase64Url(JSON.stringify(header)),
    encodeBase64Url(JSON.stringify(payload)),
    signature,
  ].join('.');
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function result(label = 'Differences'): HTMLTextAreaElement {
  return screen.getByLabelText(label) as HTMLTextAreaElement;
}

const left = token({ alg: 'HS256' }, { sub: 'a', exp: 1_700_000_000 });
const right = token({ alg: 'RS256' }, { sub: 'a', exp: 1_700_003_600 }, 'b3RoZXI');

describe('JwtDiffTool', () => {
  it('shows header, payload and date changes', () => {
    render(<JwtDiffTool />);
    fill('Token A', left);
    fill('Token B', right);
    expect(result().value).toContain('~ $.alg: "HS256" → "RS256"');
    expect(result().value).toContain('~ $.exp: 1700000000 → 1700003600');
    expect(result().value).toContain(
      'exp: 2023-11-14T22:13:20.000Z (2023-11-14T22:13:20Z) → 2023-11-14T23:13:20.000Z (2023-11-14T23:13:20Z) [+3600 s]',
    );
    expect(result().value).toContain('Signature: different.');
  });

  it('reports equal tokens', () => {
    render(<JwtDiffTool />);
    fill('Token A', left);
    fill('Token B', left);
    expect(result().value).toBe('Header and payload are equal.\n\nSignature: identical.');
  });

  it('says which token failed', () => {
    render(<JwtDiffTool />);
    fill('Token A', left);
    fill('Token B', 'a.b');
    expect(screen.getByRole('alert')).toHaveTextContent('Token B · ');
  });

  it('keeps tokens out of the URL and snippets', () => {
    render(<JwtDiffTool />);
    fill('Token A', left);
    fill('Token B', right);
    expect(window.location.search).not.toContain(left.slice(0, 10));
    expect(screen.queryByRole('button', { name: 'Save snippet' })).not.toBeInTheDocument();
  });

  it('previews the placeholder diff', () => {
    render(<JwtDiffTool />);
    expect(result().placeholder).toContain('~ $.role: "viewer" → "admin"');
  });

  it('renders in Spanish', () => {
    render(
      <LocaleProvider locale="es">
        <JwtDiffTool />
      </LocaleProvider>,
    );
    fill('Token A', left);
    fill('Token B', left);
    expect(result('Diferencias').value).toContain('Header y payload son iguales.');
  });
});
