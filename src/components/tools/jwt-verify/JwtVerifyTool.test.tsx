import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import { rfc7515A1Key, rfc7515A1Token, rfc7515A5Token } from '~/lib/tools/jose/rfc-vectors';
import { SAMPLE_JWT, SAMPLE_SECRET } from '~/lib/tools/jose/samples';
import JwtVerifyTool from './JwtVerifyTool';

const KEY_LABEL = 'Key: shared secret, PEM public key, JWK or JWKS';

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function result(label = 'Result'): HTMLTextAreaElement {
  return screen.getByLabelText(label) as HTMLTextAreaElement;
}

describe('JwtVerifyTool', () => {
  it('verifies the RFC 7515 A.1 token', async () => {
    render(<JwtVerifyTool />);
    fill('Token (JWT)', rfc7515A1Token);
    fill(KEY_LABEL, JSON.stringify(rfc7515A1Key));
    await waitFor(() => expect(result().value).toContain('Signature valid'));
    expect(result().value).toContain('alg: HS256');
  });

  it('warns about short secrets', async () => {
    render(<JwtVerifyTool />);
    fill('Token (JWT)', SAMPLE_JWT);
    fill(KEY_LABEL, SAMPLE_SECRET);
    await waitFor(() => expect(result().value).toContain('Signature valid'));
    expect(screen.getByText(/The secret has 19 bytes/)).toBeInTheDocument();
  });

  it('shows the failure for a wrong key and never reports it as valid', async () => {
    render(<JwtVerifyTool />);
    fill('Token (JWT)', SAMPLE_JWT);
    fill(KEY_LABEL, 'wrong');
    await waitFor(() => expect(result().value).toContain('NOT verified'));
    expect(screen.getByRole('alert')).toHaveTextContent('The signature does not match');
    expect(screen.queryByText('Signature valid')).not.toBeInTheDocument();
  });

  it('never verifies alg none', async () => {
    render(<JwtVerifyTool />);
    fill('Token (JWT)', rfc7515A5Token);
    fill(KEY_LABEL, 'secret');
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('never verified'));
  });

  it('reports malformed tokens', async () => {
    render(<JwtVerifyTool />);
    fill('Token (JWT)', 'a.b');
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('this one has 2'));
  });

  it('keeps the token and key out of the URL, snippets and history', async () => {
    render(<JwtVerifyTool />);
    fill('Token (JWT)', SAMPLE_JWT);
    fill(KEY_LABEL, 'hunter2');
    await waitFor(() => expect(result().value).toContain('NOT verified'));
    expect(window.location.search).not.toContain('hunter2');
    expect(window.location.search).not.toContain(SAMPLE_JWT.slice(0, 10));
    expect(screen.queryByRole('button', { name: 'Save snippet' })).not.toBeInTheDocument();
  });

  it('previews the placeholder result', async () => {
    render(<JwtVerifyTool />);
    await waitFor(() => expect(result().placeholder).toContain('Signature valid'));
  });

  it('renders in Spanish', async () => {
    render(
      <LocaleProvider locale="es">
        <JwtVerifyTool />
      </LocaleProvider>,
    );
    expect(
      screen.getByLabelText('Clave: secreto compartido, clave pública PEM, JWK o JWKS'),
    ).toBeInTheDocument();
    fill('Token (JWT)', SAMPLE_JWT);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Pega una clave'));
    expect(result('Resultado').value).toBe('NO verificado');
  });
});
