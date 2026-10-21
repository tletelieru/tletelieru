import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { readParams, useUrlState, writeParams } from './url-state';

const defaults = { input: '', dots: true, count: 5, mode: 'validate' };

describe('readParams', () => {
  it('returns defaults when no params are present', () => {
    expect(readParams(defaults, '')).toEqual(defaults);
  });

  it('parses values using the type of each default', () => {
    expect(readParams(defaults, '?input=a%0Ab&dots=0&count=12&mode=generate')).toEqual({
      input: 'a\nb',
      dots: false,
      count: 12,
      mode: 'generate',
    });
  });

  it('ignores invalid numbers and unknown keys', () => {
    expect(readParams(defaults, '?count=abc&other=1')).toEqual(defaults);
  });
});

describe('writeParams', () => {
  it('omits values equal to defaults', () => {
    expect(writeParams(defaults, defaults)).toBe('');
  });

  it('serializes changed values and keeps foreign params', () => {
    const query = writeParams({ ...defaults, dots: false, count: 3 }, defaults, '?utm=x');
    expect(new URLSearchParams(query)).toEqual(new URLSearchParams('utm=x&dots=0&count=3'));
  });
});

describe('useUrlState', () => {
  it('hydrates from the URL and writes updates back', () => {
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/tool/?count=9');
    const { result } = renderHook(() => useUrlState(defaults));
    expect(result.current[0].count).toBe(9);

    act(() => result.current[1]({ input: '12.345.678-5' }));
    act(() => vi.advanceTimersByTime(300));

    expect(new URLSearchParams(window.location.search).get('input')).toBe('12.345.678-5');
    expect(new URLSearchParams(window.location.search).get('count')).toBe('9');
    vi.useRealTimers();
  });

  it('does not touch the URL when sync is disabled', () => {
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/tool/?input=secret');
    const { result } = renderHook(() => useUrlState(defaults, { sync: false }));
    expect(result.current[0].input).toBe('');

    act(() => result.current[1]({ input: 'token' }));
    act(() => vi.advanceTimersByTime(300));

    expect(window.location.search).toBe('?input=secret');
    vi.useRealTimers();
  });
});
