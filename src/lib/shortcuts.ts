export type ShortcutAction = 'copy-output' | 'clear-input' | 'swap';

export interface ShortcutEvent {
  key: string;
  code: string;
  altKey: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}

export interface ShortcutDefinition {
  action: ShortcutAction;
  code: string;
  key: string;
}

export const shortcutList: readonly ShortcutDefinition[] = [
  { action: 'copy-output', code: 'KeyC', key: 'C' },
  { action: 'clear-input', code: 'KeyX', key: 'X' },
  { action: 'swap', code: 'KeyS', key: 'S' },
];

export function matchShortcut(event: ShortcutEvent): ShortcutAction | null {
  if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) return null;
  return shortcutList.find((shortcut) => shortcut.code === event.code)?.action ?? null;
}

export function formatShortcut(action: ShortcutAction, isMac: boolean): string {
  const shortcut = shortcutList.find((item) => item.action === action);
  if (!shortcut) return '';
  return isMac ? `⌥⇧${shortcut.key}` : `Alt+Shift+${shortcut.key}`;
}

export function isMacPlatform(platform: string): boolean {
  return /mac|iphone|ipad|ipod/i.test(platform);
}
