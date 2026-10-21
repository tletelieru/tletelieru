import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import HashTool from './HashTool';

function outputValue(label = 'Output'): string {
  return (screen.getByLabelText(label) as HTMLTextAreaElement).value;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('HashTool', () => {
  it('hashes text with every algorithm and offers a copy button per row', async () => {
    render(<HashTool />);
    await userEvent.type(screen.getByLabelText('Text to hash (UTF-8)'), 'abc');
    await waitFor(() =>
      expect(outputValue()).toContain(
        'SHA-256  ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      ),
    );
    expect(outputValue().split('\n')[0]).toBe('MD5      900150983cd24fb0d6963f7d28e17f72');
    expect(screen.getByRole('button', { name: 'Copy SHA-512' })).toBeInTheDocument();
  });

  it('hydrates a single algorithm and uppercase hex from the URL', async () => {
    window.history.replaceState(null, '', '/?algorithm=sha1&format=HEX&input=abc');
    render(<HashTool />);
    await waitFor(() => expect(outputValue()).toBe('A9993E364706816ABA3E25717850C26C9CD0D89D'));
  });

  it('computes HMACs without writing the key to the URL', async () => {
    window.history.replaceState(null, '', '/?mode=hmac&algorithm=sha256');
    render(<HashTool />);
    await userEvent.type(screen.getByLabelText('HMAC key'), 'Jefe');
    await userEvent.type(screen.getByLabelText('Message (UTF-8)'), 'what do ya want for nothing?');
    await waitFor(() =>
      expect(outputValue()).toBe(
        '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
      ),
    );
    await wait(300);
    expect(window.location.search).toContain('input=');
    expect(window.location.search).not.toContain('Jefe');
    expect(screen.queryByRole('button', { name: 'Save snippet' })).not.toBeInTheDocument();
  });

  it('decodes hex keys and reports invalid ones', async () => {
    window.history.replaceState(
      null,
      '',
      '/?mode=hmac&algorithm=md5&keyEncoding=hex&input=Hi%20There',
    );
    render(<HashTool />);
    const key = screen.getByLabelText('HMAC key');
    await userEvent.type(key, 'zz');
    expect(screen.getByText('The key is not valid hex (pairs of 0-9 / a-f).')).toBeInTheDocument();
    await userEvent.clear(key);
    await userEvent.type(key, '0b'.repeat(16));
    await waitFor(() => expect(outputValue()).toBe('9294727a3638bb1c13f48ef8158bfc9d'));
  });

  it('verifies an expected hash from the URL case-insensitively', async () => {
    window.history.replaceState(
      null,
      '',
      '/?mode=verify&input=abc&expected=900150983CD24FB0D6963F7D28E17F72',
    );
    render(<HashTool />);
    expect(await screen.findByText('✔ Matches MD5 (hex)')).toBeInTheDocument();
  });

  it('reports a mismatch with the algorithms that fit the length', async () => {
    window.history.replaceState(null, '', '/?mode=verify&input=abd');
    render(<HashTool />);
    await userEvent.type(screen.getByLabelText('Expected hash'), 'a'.repeat(64));
    expect(await screen.findByText('✘ No match (length fits SHA-256)')).toBeInTheDocument();
  });

  it('hashes a file', async () => {
    render(<HashTool />);
    const file = new File(['abc'], 'abc.txt', { type: 'text/plain' });
    await userEvent.upload(screen.getByLabelText('Hash a file'), file);
    expect(await screen.findByText(/Hashing file abc\.txt/)).toBeInTheDocument();
    await waitFor(() => expect(outputValue()).toContain('900150983cd24fb0d6963f7d28e17f72'));
    await userEvent.click(screen.getByRole('button', { name: 'Clear file' }));
    expect(outputValue()).toBe('');
  });

  it('renders in Spanish inside a Spanish locale', async () => {
    window.history.replaceState(null, '', '/?mode=verify&input=abc');
    render(
      <LocaleProvider locale="es">
        <HashTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Verificar' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Clave HMAC (opcional)'), 'Jefe');
    await userEvent.type(screen.getByLabelText('Hash esperado'), 'nope');
    expect(
      await screen.findByText('✘ No coincide (no es un largo de digest conocido)'),
    ).toBeInTheDocument();
    expect(outputValue('Resultado')).toContain('HMAC-SHA-256');
    await wait(300);
    expect(window.location.search).not.toContain('Jefe');
  });
});
