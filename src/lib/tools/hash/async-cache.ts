export type AsyncEntry<T> =
  { status: 'pending' } | { status: 'done'; value: T } | { status: 'error'; error: unknown };

export interface AsyncCache<T> {
  subscribe: (listener: () => void) => () => void;
  getVersion: () => number;
  read: (key: string, compute: () => Promise<T>) => AsyncEntry<T>;
}

export function createAsyncCache<T>(limit = 8): AsyncCache<T> {
  const entries = new Map<string, AsyncEntry<T>>();
  const listeners = new Set<() => void>();
  let version = 0;

  const settle = (key: string, pending: AsyncEntry<T>, next: AsyncEntry<T>) => {
    if (entries.get(key) !== pending) return;
    entries.set(key, next);
    version++;
    for (const listener of listeners) listener();
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getVersion: () => version,
    read(key, compute) {
      const existing = entries.get(key);
      if (existing) {
        entries.delete(key);
        entries.set(key, existing);
        return existing;
      }
      const pending: AsyncEntry<T> = { status: 'pending' };
      entries.set(key, pending);
      while (entries.size > limit) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        entries.delete(oldest);
      }
      compute().then(
        (value) => settle(key, pending, { status: 'done', value }),
        (error: unknown) => settle(key, pending, { status: 'error', error }),
      );
      return pending;
    },
  };
}
