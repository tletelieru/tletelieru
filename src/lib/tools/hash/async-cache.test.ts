import { describe, expect, it, vi } from 'vitest';
import { createAsyncCache } from './async-cache';

describe('createAsyncCache', () => {
  it('computes once per key and notifies when settled', async () => {
    const cache = createAsyncCache<number>();
    const listener = vi.fn();
    cache.subscribe(listener);
    const compute = vi.fn(() => Promise.resolve(42));

    expect(cache.read('a', compute)).toEqual({ status: 'pending' });
    expect(cache.read('a', compute)).toEqual({ status: 'pending' });
    await Promise.resolve();
    await Promise.resolve();

    expect(compute).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(cache.getVersion()).toBe(1);
    expect(cache.read('a', compute)).toEqual({ status: 'done', value: 42 });
  });

  it('records errors and evicts the oldest entries', async () => {
    const cache = createAsyncCache<number>(2);
    cache.read('bad', () => Promise.reject(new Error('boom')));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(cache.read('bad', () => Promise.resolve(1)).status).toBe('error');

    cache.read('b', () => Promise.resolve(2));
    cache.read('c', () => Promise.resolve(3));
    const recompute = vi.fn(() => Promise.resolve(4));
    cache.read('bad', recompute);
    expect(recompute).toHaveBeenCalledTimes(1);
  });

  it('stops notifying after unsubscribe', async () => {
    const cache = createAsyncCache<number>();
    const listener = vi.fn();
    const unsubscribe = cache.subscribe(listener);
    unsubscribe();
    cache.read('a', () => Promise.resolve(1));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(listener).not.toHaveBeenCalled();
  });
});
