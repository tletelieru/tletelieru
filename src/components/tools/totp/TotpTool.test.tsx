import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import TotpTool from './TotpTool';

const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

function code(): string {
  return screen.getByLabelText('Current code').textContent ?? '';
}

afterEach(() => {
  vi.useRealTimers();
});

describe('TotpTool', () => {
  it('shows the RFC 4226 HOTP codes and moves the counter', async () => {
    window.history.replaceState(null, '', '/?type=hotp');
    render(<TotpTool />);
    fireEvent.change(screen.getByLabelText('Secret (base32) or otpauth:// URI'), {
      target: { value: SECRET },
    });
    expect(await screen.findByText('755 224')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next counter' }));
    expect(await screen.findByText('287 082')).toBeInTheDocument();
    expect(screen.getByText('Previous: 755 224 · Next: 359 152')).toBeInTheDocument();
  });

  it('computes the TOTP code for the current time and counts down', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: 59_000 });
    window.history.replaceState(null, '', '/?digits=8');
    render(<TotpTool />);
    fireEvent.change(screen.getByLabelText('Secret (base32) or otpauth:// URI'), {
      target: { value: SECRET },
    });
    expect(await screen.findByText('9428 7082')).toBeInTheDocument();
    expect(screen.getByText('Changes in 1s')).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('Changes in 30s')).toBeInTheDocument();
  });

  it('applies the otpauth URI settings and shows the account', async () => {
    render(<TotpTool />);
    fireEvent.change(screen.getByLabelText('Secret (base32) or otpauth:// URI'), {
      target: {
        value: `otpauth://hotp/ACME:jane?secret=${SECRET}&issuer=ACME&counter=1&digits=6`,
      },
    });
    expect(await screen.findByText('287 082')).toBeInTheDocument();
    expect(screen.getByText(/ACME · jane/)).toBeInTheDocument();
    expect(screen.getByText('Settings from the otpauth URI')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'HOTP' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('never writes the secret to the URL', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<TotpTool />);
    fireEvent.change(screen.getByLabelText('Secret (base32) or otpauth:// URI'), {
      target: { value: SECRET },
    });
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(window.location.search).not.toContain(SECRET);
    expect(code()).not.toBe('–');
  });

  it('explains invalid secrets', () => {
    render(<TotpTool />);
    fireEvent.change(screen.getByLabelText('Secret (base32) or otpauth:// URI'), {
      target: { value: 'not base32!' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('The secret is not valid base32');
    expect(code()).toBe('–');
  });

  it('renders in Spanish', () => {
    render(
      <LocaleProvider locale="es">
        <TotpTool />
      </LocaleProvider>,
    );
    expect(screen.getByLabelText('Secreto (base32) o URI otpauth://')).toBeInTheDocument();
    expect(screen.getByText(/El secreto se queda en esta pestaña/)).toBeInTheDocument();
  });
});
