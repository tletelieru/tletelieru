import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import { historyStore } from '~/lib/user-data/history';
import { HISTORY_DELAY_MS, InputPanel } from './InputPanel';
import { OutputPanel } from './OutputPanel';
import { ToolProvider, useToolContext, type InputHandle, type OutputHandle } from './ToolContext';

function Harness({ history = true }: { history?: boolean }) {
  const [value, setValue] = useState('');
  return <InputPanel label="Values" value={value} onChange={setValue} history={history} />;
}

function mockClipboard(readText: () => Promise<string>) {
  Object.defineProperty(navigator, 'clipboard', { value: { readText }, configurable: true });
}

const handles: { input: InputHandle | null; output: OutputHandle | null } = {
  input: null,
  output: null,
};

function HandleProbe() {
  const { inputRef, outputRef } = useToolContext();
  return (
    <button
      type="button"
      onClick={() => {
        handles.input = inputRef.current;
        handles.output = outputRef.current;
      }}
    >
      probe
    </button>
  );
}

describe('InputPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    window.localStorage.clear();
  });

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

  it('records typed input in the tool history after a pause', () => {
    vi.useFakeTimers();
    render(
      <ToolProvider slug="rut">
        <Harness />
      </ToolProvider>,
    );
    fireEvent.change(screen.getByLabelText('Values'), { target: { value: '12.345' } });
    fireEvent.change(screen.getByLabelText('Values'), { target: { value: '12.345.678-5' } });
    expect(historyStore.get().rut).toBeUndefined();
    act(() => vi.advanceTimersByTime(HISTORY_DELAY_MS));
    expect(historyStore.get().rut?.map((entry) => entry.value)).toEqual(['12.345.678-5']);
  });

  it('does not record history outside a tool or when disabled', () => {
    vi.useFakeTimers();
    const { unmount } = render(<Harness />);
    fireEvent.change(screen.getByLabelText('Values'), { target: { value: 'a' } });
    act(() => vi.advanceTimersByTime(HISTORY_DELAY_MS));
    unmount();
    render(
      <ToolProvider slug="jwt">
        <Harness history={false} />
      </ToolProvider>,
    );
    fireEvent.change(screen.getByLabelText('Values'), { target: { value: 'secret' } });
    act(() => vi.advanceTimersByTime(HISTORY_DELAY_MS));
    expect(historyStore.get()).toEqual({});
  });

  it('exposes the input and output to the tool context', () => {
    render(
      <ToolProvider slug="rut">
        <Harness />
        <OutputPanel value="result" />
        <HandleProbe />
      </ToolProvider>,
    );
    fireEvent.change(screen.getByLabelText('Values'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'probe' }));
    expect(handles.input?.value).toBe('abc');
    expect(handles.output?.value).toBe('result');
    act(() => handles.input?.set('swapped'));
    expect((screen.getByLabelText('Values') as HTMLTextAreaElement).value).toBe('swapped');
  });
});
