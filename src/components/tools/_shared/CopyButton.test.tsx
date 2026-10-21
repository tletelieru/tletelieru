import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CopyButton } from './CopyButton';

describe('CopyButton', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('copies the text and resets the label after a moment', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    render(<CopyButton text="12.345.678-5" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    });

    expect(writeText).toHaveBeenCalledWith('12.345.678-5');
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('is disabled without text', () => {
    render(<CopyButton text="" />);
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled();
  });
});
