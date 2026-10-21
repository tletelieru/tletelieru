import { useImperativeHandle, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import { ToolProvider, useToolContext } from '../tools/_shared/ToolContext';
import { NOTICE_DURATION, useToolShortcuts } from './useToolShortcuts';
import { ShortcutNotice } from './ShortcutNotice';
import { ShortcutsHint } from './ShortcutsHint';

function Tool({ initialInput, output }: { initialInput: string; output: string }) {
  const { inputRef, outputRef } = useToolContext();
  const [value, setValue] = useState(initialInput);
  useImperativeHandle(inputRef, () => ({ value, set: setValue }), [value]);
  useImperativeHandle(outputRef, () => ({ value: output }), [output]);
  const { onKeyDown, notice, dismiss } = useToolShortcuts();
  return (
    <div onKeyDown={onKeyDown}>
      <textarea
        aria-label="input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <output aria-label="notice">{notice ?? ''}</output>
      <button type="button" onClick={dismiss}>
        dismiss
      </button>
    </div>
  );
}

function renderTool(initialInput = 'abc', output = 'ABC', locale: 'en' | 'es' = 'en') {
  return render(
    <LocaleProvider locale={locale}>
      <ToolProvider slug="case">
        <Tool initialInput={initialInput} output={output} />
      </ToolProvider>
    </LocaleProvider>,
  );
}

function press(code: string, extra: Record<string, unknown> = {}) {
  return fireEvent.keyDown(screen.getByLabelText('input'), {
    code,
    key: code.slice(3),
    altKey: true,
    shiftKey: true,
    ...extra,
  });
}

function mockClipboard(writeText = vi.fn().mockResolvedValue(undefined)) {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  return writeText;
}

describe('useToolShortcuts', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('copies the output and shows a notice that hides itself', async () => {
    vi.useFakeTimers();
    const writeText = mockClipboard();
    renderTool();
    let notPrevented = true;
    await act(async () => {
      notPrevented = press('KeyC', { key: 'Ç' });
    });
    expect(notPrevented).toBe(false);
    expect(writeText).toHaveBeenCalledWith('ABC');
    expect(screen.getByLabelText('notice')).toHaveTextContent('Output copied');
    act(() => vi.advanceTimersByTime(NOTICE_DURATION));
    expect(screen.getByLabelText('notice')).toHaveTextContent('');
  });

  it('reports a failed copy', async () => {
    mockClipboard(vi.fn().mockRejectedValue(new Error('denied')));
    renderTool();
    await act(async () => {
      press('KeyC');
    });
    expect(screen.getByLabelText('notice')).toHaveTextContent('Could not copy to the clipboard');
  });

  it('says there is nothing to copy when the output is empty', () => {
    const writeText = mockClipboard();
    renderTool('abc', '');
    act(() => {
      press('KeyC');
    });
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.getByLabelText('notice')).toHaveTextContent('Nothing to copy');
  });

  it('clears the input', () => {
    renderTool();
    act(() => {
      press('KeyX');
    });
    expect(screen.getByLabelText('input')).toHaveValue('');
    expect(screen.getByLabelText('notice')).toHaveTextContent('Input cleared');
  });

  it('moves the output into the input', () => {
    renderTool();
    act(() => {
      press('KeyS');
    });
    expect(screen.getByLabelText('input')).toHaveValue('ABC');
    expect(screen.getByLabelText('notice')).toHaveTextContent('Output moved to input');
  });

  it('keeps the input when swapping an empty output', () => {
    renderTool('abc', '');
    act(() => {
      press('KeyS');
    });
    expect(screen.getByLabelText('input')).toHaveValue('abc');
    expect(screen.getByLabelText('notice')).toHaveTextContent('The output is empty');
  });

  it('ignores other combinations and lets them through', () => {
    renderTool();
    let notPrevented = false;
    act(() => {
      notPrevented = press('KeyX', { ctrlKey: true });
    });
    expect(notPrevented).toBe(true);
    expect(screen.getByLabelText('input')).toHaveValue('abc');
    expect(screen.getByLabelText('notice')).toHaveTextContent('');
  });

  it('dismisses the notice', () => {
    renderTool();
    act(() => {
      press('KeyX');
    });
    fireEvent.click(screen.getByRole('button', { name: 'dismiss' }));
    expect(screen.getByLabelText('notice')).toHaveTextContent('');
  });

  it('does nothing without a tool context', () => {
    function Bare() {
      const { onKeyDown, notice } = useToolShortcuts();
      return (
        <div onKeyDown={onKeyDown}>
          <textarea aria-label="input" />
          <output aria-label="notice">{notice ?? ''}</output>
        </div>
      );
    }
    render(<Bare />);
    let notPrevented = false;
    act(() => {
      notPrevented = press('KeyX');
    });
    expect(notPrevented).toBe(true);
    expect(screen.getByLabelText('notice')).toHaveTextContent('');
  });

  it('localizes notices in Spanish', () => {
    renderTool('abc', 'ABC', 'es');
    act(() => {
      press('KeyS');
    });
    expect(screen.getByLabelText('notice')).toHaveTextContent('Resultado movido a la entrada');
  });
});

describe('ShortcutNotice', () => {
  it('shows the notice and closes on request', () => {
    const onClose = vi.fn();
    const { rerender } = render(<ShortcutNotice notice={null} onClose={onClose} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    rerender(<ShortcutNotice notice="Input cleared" onClose={onClose} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Input cleared');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('ShortcutsHint', () => {
  it('lists the shortcuts with platform keys', () => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Win32');
    render(<ShortcutsHint />);
    expect(
      screen.getByText(
        'Shortcuts: Alt+Shift+C copy output · Alt+Shift+X clear input · Alt+Shift+S swap',
      ),
    ).toBeInTheDocument();
  });

  it('uses Mac symbols in Spanish', () => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
    render(
      <LocaleProvider locale="es">
        <ShortcutsHint />
      </LocaleProvider>,
    );
    expect(
      screen.getByText('Atajos: ⌥⇧C copiar resultado · ⌥⇧X limpiar entrada · ⌥⇧S intercambiar'),
    ).toBeInTheDocument();
  });
});
