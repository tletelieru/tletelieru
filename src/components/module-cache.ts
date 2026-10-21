import { createElement, use, type ComponentType, type ReactNode } from 'react';

type Loader = () => Promise<{ default: ComponentType }>;

type TrackedPromise = Promise<ComponentType> & {
  status?: 'pending' | 'fulfilled' | 'rejected';
  value?: ComponentType;
  reason?: unknown;
};

export interface ModuleCache {
  preload(key: string): Promise<ComponentType | undefined>;
  render(key: string): ReactNode;
  has(key: string): boolean;
  reset(): void;
}

export function createModuleCache(loaders: Record<string, Loader>): ModuleCache {
  const pending = new Map<string, TrackedPromise>();

  function load(key: string): TrackedPromise | undefined {
    const loader = loaders[key];
    if (!loader) return undefined;
    let promise = pending.get(key);
    if (!promise) {
      const tracked: TrackedPromise = loader().then((module) => module.default);
      tracked.status = 'pending';
      tracked.then(
        (value) => {
          tracked.status = 'fulfilled';
          tracked.value = value;
        },
        (reason: unknown) => {
          tracked.status = 'rejected';
          tracked.reason = reason;
        },
      );
      pending.set(key, tracked);
      promise = tracked;
    }
    return promise;
  }

  return {
    preload: async (key) => load(key),
    render(key) {
      const promise = load(key);
      return promise ? createElement(use(promise as Promise<ComponentType>)) : null;
    },
    has: (key) => key in loaders,
    reset() {
      pending.clear();
    },
  };
}
