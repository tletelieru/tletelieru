import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import { rfc7515A3Key } from '~/lib/tools/jose/rfc-vectors';
import { SAMPLE_PUBLIC_JWK } from '~/lib/tools/jose/samples';
import JwtKeysTool from './JwtKeysTool';

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function field(label: string): HTMLTextAreaElement {
  return screen.getByLabelText(label) as HTMLTextAreaElement;
}

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('JwtKeysTool', () => {
  it('converts a JWK to PEM', () => {
    render(<JwtKeysTool />);
    fill('Key: PEM, JWK or JWKS', SAMPLE_PUBLIC_JWK);
    expect(field('PEM').value).toContain('-----BEGIN PUBLIC KEY-----');
    expect(screen.queryByLabelText('Public PEM')).not.toBeInTheDocument();
  });

  it('derives the public half of a private key', () => {
    render(<JwtKeysTool />);
    fill('Key: PEM, JWK or JWKS', JSON.stringify(rfc7515A3Key));
    expect(field('PEM').value).toContain('-----BEGIN PRIVATE KEY-----');
    expect(field('Public PEM').value).toContain('-----BEGIN PUBLIC KEY-----');
    expect(field('Public JWK').value).not.toContain('"d"');
  });

  it('reports invalid keys and oct keys', () => {
    render(<JwtKeysTool />);
    fill('Key: PEM, JWK or JWKS', 'hello');
    expect(screen.getByRole('alert')).toHaveTextContent('not a JWK');
    fill('Key: PEM, JWK or JWKS', '{"kty":"oct","k":"AAAA"}');
    expect(screen.getByText(/Symmetric keys have no PEM form/)).toBeInTheDocument();
  });

  it('generates only on click, labels the key for testing and keeps it out of the URL', async () => {
    window.history.replaceState(null, '', '/?mode=generate');
    render(<JwtKeysTool />);
    expect(screen.getByText(/FOR TESTING ONLY/)).toBeInTheDocument();
    expect(field('JWK').value).toBe('');
    await userEvent.click(screen.getByRole('button', { name: 'Generate test key' }));
    await waitFor(() => expect(field('JWK').value).toContain('"kty": "EC"'));
    expect(field('PEM').value).toContain('BEGIN PRIVATE KEY');
    expect(field('Public PEM').value).toContain('BEGIN PUBLIC KEY');
    expect(window.location.search).not.toContain('kty');
    expect(screen.queryByRole('button', { name: 'Save snippet' })).not.toBeInTheDocument();
  });

  it('generates HMAC secrets', async () => {
    window.history.replaceState(null, '', '/?mode=generate&kind=hmac-256');
    render(<JwtKeysTool />);
    await userEvent.click(screen.getByRole('button', { name: 'Generate test key' }));
    await waitFor(() => expect(field('Secret (hex)').value).toHaveLength(64));
  });

  it('previews the placeholder conversion', () => {
    render(<JwtKeysTool />);
    expect(field('PEM').placeholder).toContain('BEGIN PUBLIC KEY');
    expect(field('Key: PEM, JWK or JWKS').placeholder).toBe(SAMPLE_PUBLIC_JWK);
  });

  it('renders in Spanish', async () => {
    render(
      <LocaleProvider locale="es">
        <JwtKeysTool />
      </LocaleProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Generar' }));
    expect(screen.getByText(/SOLO PARA PRUEBAS/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generar clave de prueba' })).toBeInTheDocument();
  });
});
