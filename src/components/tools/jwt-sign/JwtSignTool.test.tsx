import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import { SAMPLE_JWT, SAMPLE_PAYLOAD, SAMPLE_SECRET } from '~/lib/tools/jose/samples';
import JwtSignTool from './JwtSignTool';

const KEY_LABEL = 'Key: shared secret, PEM private key or JWK';

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function field(label: string): HTMLTextAreaElement {
  return screen.getByLabelText(label) as HTMLTextAreaElement;
}

afterEach(() => {
  vi.useRealTimers();
  window.history.replaceState(null, '', '/');
});

describe('JwtSignTool', () => {
  it('reproduces the well-known HS256 token', async () => {
    render(<JwtSignTool />);
    fill('Payload (JSON)', SAMPLE_PAYLOAD);
    fill(KEY_LABEL, SAMPLE_SECRET);
    await waitFor(() => expect(field('Signed token').value).toBe(SAMPLE_JWT));
    expect(screen.getByText(/The secret has 19 bytes/)).toBeInTheDocument();
  });

  it('applies iat and exp only when the buttons are pressed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: 1_700_000_000_000 });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<JwtSignTool />);
    fill('Payload (JSON)', '{"sub":"a"}');
    expect(field('Payload (JSON)').value).toBe('{"sub":"a"}');
    await user.click(screen.getByRole('button', { name: 'Set iat to now' }));
    await user.click(screen.getByRole('button', { name: 'Set exp from lifetime' }));
    expect(JSON.parse(field('Payload (JSON)').value)).toEqual({
      sub: 'a',
      iat: 1_700_000_000,
      exp: 1_700_003_600,
    });
  });

  it('explains when the helpers cannot touch the payload', async () => {
    render(<JwtSignTool />);
    fill('Payload (JSON)', '{');
    await userEvent.click(screen.getByRole('button', { name: 'Set iat to now' }));
    expect(screen.getByText(/Fix the payload JSON first/)).toBeInTheDocument();
    expect(field('Payload (JSON)').value).toBe('{');
  });

  it('requires the explicit switch for alg none and warns', async () => {
    render(<JwtSignTool />);
    fill('Payload (JSON)', '{"sub":"a"}');
    expect(field('Signed token').value).toBe('');
    await userEvent.click(screen.getByRole('switch', { name: 'Unsigned (alg: none)' }));
    await waitFor(() => expect(field('Unsigned token').value).toMatch(/\.$/));
    expect(screen.getByText(/anyone can forge it/)).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('reports JSON and key errors', async () => {
    render(<JwtSignTool />);
    fill('Payload (JSON)', '{');
    fill(KEY_LABEL, SAMPLE_SECRET);
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('payload is not valid'),
    );
    fill('Payload (JSON)', '{}');
    fill(KEY_LABEL, '-----BEGIN PUBLIC KEY-----\nAA==\n-----END PUBLIC KEY-----');
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('PEM block'));
  });

  it('keeps secrets out of the URL and snippets', async () => {
    render(<JwtSignTool />);
    fill('Payload (JSON)', SAMPLE_PAYLOAD);
    fill(KEY_LABEL, 'hunter2');
    await waitFor(() => expect(field('Signed token').value).not.toBe(''));
    expect(window.location.search).toBe('');
    expect(screen.queryByRole('button', { name: 'Save snippet' })).not.toBeInTheDocument();
  });

  it('shows the matching output placeholder', () => {
    render(<JwtSignTool />);
    expect(field('Signed token').placeholder).toBe(SAMPLE_JWT);
    expect(field('Payload (JSON)').placeholder).toBe(SAMPLE_PAYLOAD);
    expect(field(KEY_LABEL).placeholder).toBe(SAMPLE_SECRET);
  });

  it('renders in Spanish', async () => {
    render(
      <LocaleProvider locale="es">
        <JwtSignTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Poner iat en ahora' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('switch', { name: 'Sin firma (alg: none)' }));
    expect(screen.getByText(/cualquiera puede falsificarlo/)).toBeInTheDocument();
  });
});
