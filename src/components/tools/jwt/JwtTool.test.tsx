import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import { HANDOFF_KEY } from '~/lib/handoff';
import { encodeBase64Url } from '~/lib/tools/jwt';
import JwtTool from './JwtTool';

const NOW = Date.UTC(2026, 9, 20, 12, 0, 0);
const NOW_S = NOW / 1000;

function makeToken(header: unknown, payload: unknown, signature = 'c2lnbmF0dXJl'): string {
  return [
    encodeBase64Url(JSON.stringify(header)),
    encodeBase64Url(JSON.stringify(payload)),
    signature,
  ].join('.');
}

const validToken = makeToken(
  { alg: 'HS256', typ: 'JWT' },
  { sub: 'user-1', iat: NOW_S - 3 * 3600, exp: NOW_S + 12 * 60 },
);

function outputValue(label: string): string {
  return (screen.getByLabelText(label) as HTMLTextAreaElement).value;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pasteToken(label: string, value: string) {
  await userEvent.click(screen.getByLabelText(label));
  await userEvent.paste(value);
}

describe('JwtTool', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  it('decodes a Bearer token and shows claims, status and colored segments', async () => {
    render(<JwtTool />);
    await pasteToken('Token (JWT)', `Bearer ${validToken.replace('.', '.\n')}`);

    expect(outputValue('Payload')).toBe(
      `{\n  "sub": "user-1",\n  "iat": ${NOW_S - 10_800},\n  "exp": ${NOW_S + 720}\n}`,
    );
    expect(outputValue('Header')).toBe('{\n  "alg": "HS256",\n  "typ": "JWT"\n}');
    expect(screen.getByText('Valid, expires in 12 minutes')).toBeInTheDocument();
    expect(screen.getByText('alg: HS256')).toBeInTheDocument();
    expect(screen.getByText(/the signature is not verified here/)).toBeInTheDocument();

    const table = screen.getByRole('table', { name: 'Time claims' });
    expect(within(table).getByText('2026-10-20T12:12:00.000Z')).toBeInTheDocument();
    expect(within(table).getByText('2026-10-20T09:12:00-03:00')).toBeInTheDocument();
    expect(within(table).getByText('3 hours ago')).toBeInTheDocument();

    const view = screen.getByTestId('jwt-token-view');
    expect(view.textContent).toBe(validToken);
    expect(within(view).getByTitle('signature')).toHaveTextContent('c2lnbmF0dXJl');
  });

  it('never writes the token to the URL, even when other options change', async () => {
    render(<JwtTool />);
    await pasteToken('Token (JWT)', validToken);
    await userEvent.click(screen.getByLabelText('Time zone'));
    await userEvent.click(await screen.findByRole('option', { name: 'UTC' }));
    await wait(300);
    expect(window.location.search).toBe('?zone=UTC');
    expect(window.location.search).not.toContain(validToken.slice(0, 10));
    expect(screen.queryByRole('button', { name: 'Save snippet' })).not.toBeInTheDocument();
  });

  it('flags expired tokens, alg none and sensitive keys', async () => {
    render(<JwtTool />);
    await pasteToken(
      'Token (JWT)',
      makeToken({ alg: 'none' }, { exp: NOW_S - 3 * 3600, password: 'hunter2' }, ''),
    );
    expect(screen.getByText('Expired 3 hours ago')).toBeInTheDocument();
    expect(screen.getByText(/alg is "none"/)).toBeInTheDocument();
    expect(screen.getByText(/sensitive data: password/)).toBeInTheDocument();
    expect(screen.getByText('(empty)')).toBeInTheDocument();
  });

  it('reports malformed tokens', async () => {
    render(<JwtTool />);
    await pasteToken('Token (JWT)', 'abc.def');
    expect(screen.getByText(/this one has 2\./)).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Token (JWT)'));
    await userEvent.paste(`${encodeBase64Url('{"alg":}')}.${encodeBase64Url('{}')}.`);
    expect(
      screen.getByText('The header is not valid JSON (line 1, column 8).'),
    ).toBeInTheDocument();
  });

  it('loads a token handed off through sessionStorage without touching the URL', () => {
    window.sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ input: validToken }));
    window.history.replaceState(null, '', '/?handoff=1');
    render(<JwtTool />);
    expect(outputValue('Header')).toBe('{\n  "alg": "HS256",\n  "typ": "JWT"\n}');
    expect(screen.getByText(/Token loaded from smart paste/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove from address bar' })).toBeNull();
    expect(window.sessionStorage.getItem(HANDOFF_KEY)).toBeNull();
    expect(window.location.search).not.toContain(validToken.slice(0, 10));
  });

  it('accepts a legacy ?input= token and removes it from the address bar on request', async () => {
    window.history.replaceState(null, '', `/?zone=UTC&input=${validToken}`);
    render(<JwtTool />);
    expect(outputValue('Header')).toContain('HS256');
    expect(screen.getByText('2026-10-20T12:12:00Z')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove from address bar' }));
    expect(window.location.search).toBe('?zone=UTC');
    expect(screen.queryByText(/still in the address bar/)).toBeNull();
    expect(outputValue('Header')).toContain('HS256');
  });

  it('renders in Spanish inside a Spanish locale', async () => {
    render(
      <LocaleProvider locale="es">
        <JwtTool />
      </LocaleProvider>,
    );
    await pasteToken(
      'Token (JWT)',
      makeToken({ alg: 'HS256' }, { nbf: NOW_S + 2 * 3600, exp: NOW_S + 4 * 3600 }),
    );
    expect(screen.getByText('Aún no válido, empieza dentro de 2 horas')).toBeInTheDocument();
    expect(screen.getByText('nbf (no antes de)')).toBeInTheDocument();
    expect(screen.getByText(/aquí no se verifica la firma/)).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Token (JWT)'));
    await userEvent.paste('a.b.c.d.e');
    expect(screen.getByText(/Parece un JWE cifrado/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Copiar' }).length).toBeGreaterThan(0);
  });
});
