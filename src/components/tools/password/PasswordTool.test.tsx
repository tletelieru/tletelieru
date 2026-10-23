import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import PasswordTool from './PasswordTool';

function values(label = 'Generated'): string[] {
  return (screen.getByLabelText(label) as HTMLTextAreaElement).value.split('\n');
}

describe('PasswordTool', () => {
  it('generates passwords with the chosen length and count', () => {
    window.history.replaceState(null, '', '/?length=12&count=3');
    render(<PasswordTool />);
    const generated = values();
    expect(generated).toHaveLength(3);
    for (const password of generated) expect(password).toHaveLength(12);
    expect(screen.getByText(/bits of entropy · /)).toBeInTheDocument();
  });

  it('regenerates on demand', async () => {
    render(<PasswordTool />);
    const before = values();
    await userEvent.click(screen.getByRole('button', { name: 'Generate again' }));
    expect(values()).not.toEqual(before);
  });

  it('limits characters to the chosen sets', async () => {
    window.history.replaceState(null, '', '/?sets=digits&count=10');
    render(<PasswordTool />);
    for (const password of values()) expect(password).toMatch(/^\d{20}$/);
    await userEvent.click(screen.getByRole('button', { name: '0-9' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Pick at least one character set.');
  });

  it('generates passphrases', async () => {
    render(<PasswordTool />);
    await userEvent.click(screen.getByRole('button', { name: 'Passphrase' }));
    for (const phrase of values()) expect(phrase.split('-')).toHaveLength(5);
    expect(screen.getByText('43 bits of entropy · fair')).toBeInTheDocument();
  });

  it('never writes passwords to the URL', async () => {
    render(<PasswordTool />);
    const [first = ''] = values();
    await userEvent.click(screen.getByRole('button', { name: 'Generate again' }));
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(decodeURIComponent(window.location.search)).not.toContain(first);
  });

  it('renders in Spanish', () => {
    render(
      <LocaleProvider locale="es">
        <PasswordTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Frase de contraseña' })).toBeInTheDocument();
    expect(screen.getByLabelText('Excluir ambiguos (Il1O0o)')).toBeInTheDocument();
    expect(screen.getByText(/bits de entropía · muy fuerte/)).toBeInTheDocument();
  });
});
