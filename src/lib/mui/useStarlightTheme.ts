import { useSyncExternalStore } from 'react';
import type { ColorMode } from './theme';

function read(): ColorMode {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

export function useStarlightTheme(): ColorMode {
  return useSyncExternalStore(subscribe, read, () => 'dark');
}
