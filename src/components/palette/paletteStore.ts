import { useSyncExternalStore } from 'react';

export type ShortcutAction = 'toggle' | 'open' | null;

interface ShortcutEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  target: EventTarget | null;
}

let open = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function setOpen(next: boolean) {
  if (open === next) return;
  open = next;
  emit();
}

export function openPalette(): void {
  setOpen(true);
}

export function closePalette(): void {
  setOpen(false);
}

export function togglePalette(): void {
  setOpen(!open);
}

export function getPaletteOpen(): boolean {
  return open;
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (typeof Element === 'undefined' || !(target instanceof Element)) return false;
  if (target.closest('[contenteditable=""], [contenteditable="true"]')) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function shortcutAction(event: ShortcutEvent, isOpen: boolean): ShortcutAction {
  if (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey) && !event.altKey) {
    return 'toggle';
  }
  if (
    event.key === '/' &&
    !isOpen &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !isEditableTarget(event.target)
  ) {
    return 'open';
  }
  return null;
}

function onKeyDown(event: KeyboardEvent) {
  const action = shortcutAction(event, open);
  if (!action) return;
  event.preventDefault();
  if (action === 'toggle') togglePalette();
  else openPalette();
}

export function subscribePalette(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) document.addEventListener('keydown', onKeyDown);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) document.removeEventListener('keydown', onKeyDown);
  };
}

export function usePaletteOpen(): boolean {
  return useSyncExternalStore(subscribePalette, getPaletteOpen, () => false);
}
