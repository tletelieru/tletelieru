import { useSyncExternalStore } from 'react';

export interface LocalStore<T> {
  key: string;
  initial: T;
  get(): T;
  set(next: T | ((previous: T) => T)): void;
  subscribe(listener: () => void): () => void;
}

interface LocalStoreOptions<T> {
  key: string;
  initial: T;
  parse: (raw: unknown) => T | null;
}

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, raw: string): boolean {
  try {
    window.localStorage.setItem(key, raw);
    return true;
  } catch {
    return false;
  }
}

export function decode<T>(raw: string | null, parse: (value: unknown) => T | null, initial: T): T {
  if (raw === null) return initial;
  try {
    return parse(JSON.parse(raw)) ?? initial;
  } catch {
    return initial;
  }
}

export function createLocalStore<T>({ key, initial, parse }: LocalStoreOptions<T>): LocalStore<T> {
  const listeners = new Set<() => void>();
  let cache: { raw: string | null; value: T } | null = null;
  let memoryOnly = false;

  function read(): T {
    if (typeof window === 'undefined') return initial;
    if (memoryOnly && cache) return cache.value;
    const raw = readRaw(key);
    if (cache && cache.raw === raw) return cache.value;
    cache = { raw, value: decode(raw, parse, initial) };
    return cache.value;
  }

  function emit() {
    for (const listener of listeners) listener();
  }

  function onStorage(event: StorageEvent) {
    if (event.key === key || event.key === null) emit();
  }

  return {
    key,
    initial,
    get: read,
    set(next) {
      const value = typeof next === 'function' ? (next as (previous: T) => T)(read()) : next;
      const raw = JSON.stringify(value);
      memoryOnly = !writeRaw(key, raw);
      cache = { raw, value };
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) window.addEventListener('storage', onStorage);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) window.removeEventListener('storage', onStorage);
      };
    },
  };
}

export function useLocalStore<T>(store: LocalStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, () => store.initial);
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
