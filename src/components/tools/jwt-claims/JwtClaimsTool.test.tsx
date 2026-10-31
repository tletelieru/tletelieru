import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import { encodeBase64Url } from '~/lib/tools/jwt';
import JwtClaimsTool from './JwtClaimsTool';

const NOW_S = 1_700_000_000;

function token(payload: object): string {
  return [
    encodeBase64Url('{"alg":"HS256"}'),
    encodeBase64Url(JSON.stringify(payload)),
    'c2ln',
  ].join('.');
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function result(label = 'Result'): HTMLTextAreaElement {
  return screen.getByLabelText(label) as HTMLTextAreaElement;
}

afterEach(() => {
  vi.useRealTimers();
  window.history.replaceState(null, '', '/');
});

describe('JwtClaimsTool', () => {
  it('evaluates against the current time', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: NOW_S * 1000 });
    render(<JwtClaimsTool />);
    fill('Token (JWT)', token({ exp: NOW_S - 3600, iss: 'a' }));
    expect(result().value).toContain('[FAIL] exp:');
    expect(result().value).toContain('expired');
    expect(screen.getByText('One or more claims failed.')).toBeInTheDocument();
  });

  it('uses a fixed evaluation time from the URL', () => {
    window.history.replaceState(null, '', `/?at=${NOW_S - 7200}`);
    render(<JwtClaimsTool />);
    fill('Token (JWT)', token({ exp: NOW_S - 3600 }));
    expect(result().value).toContain('[OK] exp:');
    expect(screen.getByText('All checks passed.')).toBeInTheDocument();
  });

  it('compares expected values', () => {
    window.history.replaceState(null, '', `/?at=${NOW_S}`);
    render(<JwtClaimsTool />);
    fill('Token (JWT)', token({ exp: NOW_S + 60, aud: ['api'], iss: 'other' }));
    fill('Expected iss', 'mine');
    fill('Expected aud', 'api');
    expect(result().value).toContain('[FAIL] iss: "other" does not match');
    expect(result().value).toContain('[OK] aud:');
  });

  it('reports an invalid evaluation time and bad tokens', () => {
    render(<JwtClaimsTool />);
    fill('Evaluate at (ISO or Unix)', 'soon');
    expect(screen.getByText(/not a valid date/)).toBeInTheDocument();
    fill('Token (JWT)', 'a.b');
    expect(screen.getByText(/this one has 2/)).toBeInTheDocument();
  });

  it('never writes the token or expected values to the URL', () => {
    render(<JwtClaimsTool />);
    const value = token({ exp: 1 });
    fill('Token (JWT)', value);
    fill('Expected iss', 'private-issuer');
    expect(window.location.search).not.toContain(value.slice(0, 10));
    expect(window.location.search).not.toContain('private-issuer');
    expect(screen.queryByRole('button', { name: 'Save snippet' })).not.toBeInTheDocument();
  });

  it('shows a deterministic placeholder', () => {
    render(<JwtClaimsTool />);
    expect(result().placeholder).toContain('2023-11-14T22:23:20Z');
    expect(result().placeholder).toContain('[OK] iss: "https://issuer.example"');
  });

  it('renders in Spanish', () => {
    window.history.replaceState(null, '', `/?at=${NOW_S}`);
    render(
      <LocaleProvider locale="es">
        <JwtClaimsTool />
      </LocaleProvider>,
    );
    fill('Token (JWT)', token({ iat: NOW_S + 100_000 }));
    expect(result('Resultado').value).toContain('[FALLA] iat:');
    expect(result('Resultado').value).toContain('emitido en el futuro');
  });
});
