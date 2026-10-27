const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

export const clock = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    if (listeners.size === 1) {
      timer = setInterval(() => {
        for (const current of listeners) current();
      }, 1000);
    }
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) clearInterval(timer);
    };
  },
  now: (): number => Math.floor(Date.now() / 1000) * 1000,
  server: (): number => 0,
};
