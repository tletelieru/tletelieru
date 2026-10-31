import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import { encodeBase64Url } from '~/lib/tools/jwt';
import JwtLintTool from './JwtLintTool';

function token(header: object, payload: object): string {
  return [
    encodeBase64Url(JSON.stringify(header)),
    encodeBase64Url(JSON.stringify(payload)),
    'c2ln',
  ].join('.');
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function result(label = 'Findings'): HTMLTextAreaElement {
  return screen.getByLabelText(label) as HTMLTextAreaElement;
}

const KEY_LABEL = 'Key (optional): enables the key checks';

describe('JwtLintTool', () => {
  it('lists findings by severity', () => {
    render(<JwtLintTool />);
    fill(
      'Token (JWT)',
      token({ alg: 'none', jku: 'https://evil.example/jwks' }, { password: 'x' }),
    );
    expect(result().value.split('\n')[0]).toMatch(/^\[HIGH\] /);
    expect(result().value).toContain('alg is "none"');
    expect(result().value).toContain('jku header (https://evil.example/jwks)');
    expect(result().value).toContain('Sensitive-looking claims: password');
    expect(screen.getByText('4 findings')).toBeInTheDocument();
  });

  it('uses the key for strength and confusion checks', () => {
    render(<JwtLintTool />);
    fill('Token (JWT)', token({ alg: 'HS256' }, { iat: 1, exp: 100 }));
    expect(result().value).toContain('alg confusion attempt');
    fill(KEY_LABEL, 'short');
    expect(result().value).toContain('Weak key: 5 bytes');
    fill(KEY_LABEL, '{"kty":"EC","crv":"P-256","x":"AA","y":"AA"}');
    expect(result().value).toContain('this is the alg confusion attack');
  });

  it('reports a clean token and bad input', () => {
    render(<JwtLintTool />);
    fill('Token (JWT)', token({ alg: 'RS256' }, { iat: 4_000_000_000, exp: 4_000_000_100 }));
    expect(result().value).not.toContain('HIGH');
    fill('Token (JWT)', 'nope');
    expect(screen.getByRole('alert')).toHaveTextContent('this one has 1');
  });

  it('keeps tokens out of the URL and snippets', () => {
    render(<JwtLintTool />);
    const value = token({ alg: 'HS256' }, {});
    fill('Token (JWT)', value);
    expect(window.location.search).toBe('');
    expect(screen.queryByRole('button', { name: 'Save snippet' })).not.toBeInTheDocument();
  });

  it('previews the placeholder findings', () => {
    render(<JwtLintTool />);
    expect(result().placeholder).toContain('alg is "none"');
    expect(result().placeholder).toContain('jku header');
  });

  it('renders in Spanish', () => {
    render(
      <LocaleProvider locale="es">
        <JwtLintTool />
      </LocaleProvider>,
    );
    fill('Token (JWT)', token({ alg: 'none' }, { iat: 1 }));
    expect(result('Hallazgos').value).toContain('[ALTO] alg es "none"');
    expect(result('Hallazgos').value).toContain('este token nunca expira');
  });
});
