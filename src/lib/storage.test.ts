import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLocalStore, decode, isStringArray, useLocalStore } from './storage';

function makeStore(key = 'test:list') {
  return createLocalStore<string[]>({
    key,
    initial: [],
    parse: (raw) => (isStringArray(raw) ? raw : null),
  });
}

describe('decode', () => {
  it('falls back to the initial value for missing, corrupt or invalid data', () => {
    const parse = (raw: unknown) => (isStringArray(raw) ? raw : null);
    expect(decode(null, parse, ['x'])).toEqual(['x']);
    expect(decode('{nope', parse, ['x'])).toEqual(['x']);
    expect(decode('[1,2]', parse, ['x'])).toEqual(['x']);
    expect(decode('["a"]', parse, ['x'])).toEqual(['a']);
  });
});

describe('createLocalStore', () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('persists values and returns a stable snapshot', () => {
    const store = makeStore();
    store.set(['a']);
    expect(window.localStorage.getItem('test:list')).toBe('["a"]');
    expect(store.get()).toBe(store.get());
    store.set((previous) => [...previous, 'b']);
    expect(store.get()).toEqual(['a', 'b']);
  });

  it('notifies subscribers and reacts to other tabs', () => {
    const store = makeStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.set(['a']);
    expect(listener).toHaveBeenCalledTimes(1);

    window.localStorage.setItem('test:list', '["from-other-tab"]');
    window.dispatchEvent(new StorageEvent('storage', { key: 'test:list' }));
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.get()).toEqual(['from-other-tab']);

    unsubscribe();
    store.set([]);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('keeps working in memory when storage is unavailable', () => {
    const store = makeStore('test:blocked');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    store.set(['kept']);
    expect(store.get()).toEqual(['kept']);
  });
});

describe('useLocalStore', () => {
  afterEach(() => window.localStorage.clear());

  it('re-renders when the store changes', () => {
    const store = makeStore('test:hook');
    const { result } = renderHook(() => useLocalStore(store));
    expect(result.current).toEqual([]);
    act(() => store.set(['a']));
    expect(result.current).toEqual(['a']);
  });
});
