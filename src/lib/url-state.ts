import { useCallback, useRef, useState } from 'react';

export type UrlPrimitive = string | number | boolean;
export type UrlStateShape = Record<string, UrlPrimitive>;

export function readParams<T extends UrlStateShape>(defaults: T, search: string): T {
  const params = new URLSearchParams(search);
  const result: UrlStateShape = { ...defaults };
  for (const [key, fallback] of Object.entries(defaults)) {
    const raw = params.get(key);
    if (raw === null) continue;
    if (typeof fallback === 'number') {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) result[key] = parsed;
    } else if (typeof fallback === 'boolean') {
      result[key] = raw === '1' || raw === 'true';
    } else {
      result[key] = raw;
    }
  }
  return result as T;
}

export function writeParams<T extends UrlStateShape>(state: T, defaults: T, search = ''): string {
  const params = new URLSearchParams(search);
  for (const [key, value] of Object.entries(state)) {
    if (value === defaults[key] || value === '') {
      params.delete(key);
    } else if (typeof value === 'boolean') {
      params.set(key, value ? '1' : '0');
    } else {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export interface UrlStateOptions {
  sync?: boolean;
  debounceMs?: number;
}

export function useUrlState<T extends UrlStateShape>(
  defaults: T,
  { sync = true, debounceMs = 250 }: UrlStateOptions = {},
): [T, (patch: Partial<T>) => void] {
  const [state, setState] = useState<T>(() =>
    sync && typeof window !== 'undefined' ? readParams(defaults, window.location.search) : defaults,
  );
  const defaultsRef = useRef(defaults);
  const stateRef = useRef(state);
  const timerRef = useRef<number | undefined>(undefined);

  const update = useCallback(
    (patch: Partial<T>) => {
      const next = { ...stateRef.current, ...patch };
      stateRef.current = next;
      setState(next);
      if (!sync) return;
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        const query = writeParams(next, defaultsRef.current, window.location.search);
        const url = `${window.location.pathname}${query}${window.location.hash}`;
        window.history.replaceState(window.history.state, '', url);
      }, debounceMs);
    },
    [sync, debounceMs],
  );

  return [state, update];
}
