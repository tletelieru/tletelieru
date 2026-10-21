import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import { InputPanel } from './InputPanel';

function Harness() {
  const [value, setValue] = useState('');
  return <InputPanel label="Values" value={value} onChange={setValue} />;
}

function mockClipboard(readText: () => Promise<string>) {
  Object.defineProperty(navigator, 'clipboard', { value: { readText }, configurable: true });
}

describe('InputPanel', () => {
  afterEach(() => vi.restoreAllMocks());

  it('pastes the clipboard into the field', async () => {
    mockClipboard(vi.fn().mockResolvedValue('12.345.678-5'));
    render(<Harness />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Paste' }));
    });
    expect((screen.getByLabelText('Values') as HTMLTextAreaElement).value).toBe('12.345.678-5');
  });

  it('explains when clipboard access is blocked', async () => {
    mockClipboard(vi.fn().mockRejectedValue(new Error('denied')));
    render(
      <LocaleProvider locale="es">
        <Harness />
      </LocaleProvider>,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Pegar' }));
    });
    expect(screen.getByText(/bloqueó el acceso al portapapeles/)).toBeInTheDocument();
  });

  it('keeps typing working', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Values'), { target: { value: 'abc' } });
    expect((screen.getByLabelText('Values') as HTMLTextAreaElement).value).toBe('abc');
  });
});
