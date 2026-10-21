import { describe, expect, it } from 'vitest';
import {
  formatShortcut,
  isMacPlatform,
  matchShortcut,
  shortcutList,
  type ShortcutEvent,
} from './shortcuts';

function press(code: string, overrides: Partial<ShortcutEvent> = {}): ShortcutEvent {
  return {
    key: code.replace('Key', '').toLowerCase(),
    code,
    altKey: true,
    shiftKey: true,
    ctrlKey: false,
    metaKey: false,
    ...overrides,
  };
}

describe('matchShortcut', () => {
  it.each([
    ['KeyC', 'copy-output'],
    ['KeyX', 'clear-input'],
    ['KeyS', 'swap'],
  ] as const)('maps Alt+Shift+%s to %s', (code, action) => {
    expect(matchShortcut(press(code))).toBe(action);
  });

  it.each([
    ['Ç', 'KeyC', 'copy-output'],
    ['˛', 'KeyX', 'clear-input'],
    ['Í', 'KeyS', 'swap'],
  ] as const)('matches macOS Option characters (%s) by physical key', (key, code, action) => {
    expect(matchShortcut(press(code, { key }))).toBe(action);
  });

  it('matches by code regardless of layout', () => {
    expect(matchShortcut(press('KeyC', { key: 'j' }))).toBe('copy-output');
    expect(matchShortcut(press('KeyJ', { key: 'c' }))).toBeNull();
  });

  it.each([
    ['without Alt', { altKey: false }],
    ['without Shift', { shiftKey: false }],
    ['with Ctrl', { ctrlKey: true }],
    ['with Meta', { metaKey: true }],
  ] as const)('ignores the combination %s', (_label, overrides) => {
    expect(matchShortcut(press('KeyC', overrides))).toBeNull();
  });

  it('ignores unrelated keys', () => {
    expect(matchShortcut(press('KeyA'))).toBeNull();
    expect(matchShortcut(press('constructor'))).toBeNull();
  });
});

describe('formatShortcut', () => {
  it('uses symbols on Mac and words elsewhere', () => {
    expect(formatShortcut('copy-output', true)).toBe('⌥⇧C');
    expect(formatShortcut('clear-input', true)).toBe('⌥⇧X');
    expect(formatShortcut('swap', false)).toBe('Alt+Shift+S');
  });

  it('lists every action once', () => {
    expect(shortcutList.map((item) => item.action)).toEqual(['copy-output', 'clear-input', 'swap']);
  });
});

describe('isMacPlatform', () => {
  it.each([
    ['MacIntel', true],
    ['macOS', true],
    ['iPhone', true],
    ['Win32', false],
    ['Linux x86_64', false],
  ] as const)('%s → %s', (platform, expected) => {
    expect(isMacPlatform(platform)).toBe(expected);
  });
});
