import { useSyncExternalStore } from 'react';
import { isMacPlatform } from './shortcuts';

const subscribeNever = () => () => {};
const onClient = () => true;
const onServer = () => false;

export function useHydrated(): boolean {
  return useSyncExternalStore(subscribeNever, onClient, onServer);
}

export function useIsMac(): boolean {
  const hydrated = useHydrated();
  return hydrated && isMacPlatform(navigator.platform || navigator.userAgent);
}
