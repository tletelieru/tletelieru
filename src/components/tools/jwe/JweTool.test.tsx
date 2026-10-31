import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import { rfc7516A3Token, rfc7520NestedJwe, rfc7520Rsa4096Key } from '~/lib/tools/jose/rfc-vectors';
import { SAMPLE_JWE, SAMPLE_JWE_KEY } from '~/lib/tools/jose/samples';
import JweTool from './JweTool';

const KEY_LABEL = 'Key: AES key, RSA private PEM, JWK or JWKS';

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function field(label: string): HTMLTextAreaElement {
  return screen.getByLabelText(label) as HTMLTextAreaElement;
}

describe('JweTool', () => {
  it('inspects without a key', () => {
    render(<JweTool />);
    fill('Token (JWE)', SAMPLE_JWE);
    expect(field('Structure').value).toContain('alg: dir');
    expect(field('Structure').value).toContain('IV: 12 bytes');
    expect(field('Structure').value).toContain('Encrypted key: 0 bytes');
    expect(field('Protected header').value).toContain('"enc": "A128GCM"');
  });

  it('decrypts with the RFC 7520 key', async () => {
    render(<JweTool />);
    fill('Token (JWE)', SAMPLE_JWE);
    fill(KEY_LABEL, SAMPLE_JWE_KEY);
    await waitFor(() => expect(field('Decrypted payload').value).toContain('You can trust us'));
    expect(screen.getByText('Decrypted and authenticated.')).toBeInTheDocument();
  });

  it('fails clearly with the wrong key', async () => {
    render(<JweTool />);
    fill('Token (JWE)', SAMPLE_JWE);
    fill(KEY_LABEL, '{"kty":"oct","k":"AAAAAAAAAAAAAAAAAAAAAA"}');
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('wrong key'));
    expect(field('Decrypted payload').value).toBe('');
  });

  it('reports CBC-HS as unsupported instead of failing silently', () => {
    render(<JweTool />);
    fill('Token (JWE)', rfc7516A3Token);
    expect(screen.getByText(/"A128CBC-HS256" is not supported/)).toBeInTheDocument();
  });

  it('detects nested JWTs', async () => {
    render(<JweTool />);
    fill('Token (JWE)', rfc7520NestedJwe);
    expect(screen.getByText(/carries a nested JWT/)).toBeInTheDocument();
    fill(KEY_LABEL, JSON.stringify(rfc7520Rsa4096Key));
    await waitFor(() => expect(field('Nested JWT header').value).toContain('PS256'));
    expect(field('Nested JWT payload').value).toContain('"iss"');
  });

  it('reports structural errors', () => {
    render(<JweTool />);
    fill('Token (JWE)', 'a.b.c');
    expect(screen.getByRole('alert')).toHaveTextContent('signed JWT');
  });

  it('keeps tokens and keys out of the URL and snippets', async () => {
    render(<JweTool />);
    fill('Token (JWE)', SAMPLE_JWE);
    fill(KEY_LABEL, SAMPLE_JWE_KEY);
    await waitFor(() => expect(field('Decrypted payload').value).not.toBe(''));
    expect(window.location.search).toBe('');
    expect(screen.queryByRole('button', { name: 'Save snippet' })).not.toBeInTheDocument();
  });

  it('previews the sample structure', () => {
    render(<JweTool />);
    expect(field('Structure').placeholder).toContain('enc: A128GCM');
    expect(field('Protected header').placeholder).toContain('"alg": "dir"');
  });

  it('renders in Spanish', async () => {
    render(
      <LocaleProvider locale="es">
        <JweTool />
      </LocaleProvider>,
    );
    fill('Token (JWE)', 'a.b');
    expect(screen.getByRole('alert')).toHaveTextContent('Un JWE compacto tiene 5 partes');
    fill('Token (JWE)', rfc7516A3Token);
    expect(screen.getByText(/no está soportado/)).toBeInTheDocument();
  });
});
