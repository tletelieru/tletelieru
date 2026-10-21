import { afterEach, describe, expect, it } from 'vitest';
import {
  closePalette,
  getPaletteOpen,
  isEditableTarget,
  openPalette,
  shortcutAction,
  subscribePalette,
} from './paletteStore';

const keyEvent = (key: string, extra: Partial<Parameters<typeof shortcutAction>[0]> = {}) => ({
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  target: document.body,
  ...extra,
});

afterEach(() => closePalette());

describe('shortcutAction', () => {
  it('toggles with Ctrl+K and ⌘K', () => {
    expect(shortcutAction(keyEvent('k', { ctrlKey: true }), false)).toBe('toggle');
    expect(shortcutAction(keyEvent('K', { metaKey: true }), true)).toBe('toggle');
    expect(shortcutAction(keyEvent('k'), false)).toBeNull();
  });

  it('opens with / outside editable elements only', () => {
    expect(shortcutAction(keyEvent('/'), false)).toBe('open');
    expect(shortcutAction(keyEvent('/'), true)).toBeNull();
    const input = document.createElement('input');
    expect(shortcutAction(keyEvent('/', { target: input }), false)).toBeNull();
  });
});

describe('isEditableTarget', () => {
  it('detects inputs, textareas and contenteditable', () => {
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    const child = document.createElement('span');
    editable.append(child);
    expect(isEditableTarget(document.createElement('textarea'))).toBe(true);
    expect(isEditableTarget(child)).toBe(true);
    expect(isEditableTarget(document.createElement('button'))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});

describe('palette store', () => {
  it('notifies subscribers and listens to keydown only while subscribed', () => {
    let calls = 0;
    const unsubscribe = subscribePalette(() => calls++);
    openPalette();
    openPalette();
    expect(getPaletteOpen()).toBe(true);
    expect(calls).toBe(1);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    expect(getPaletteOpen()).toBe(false);
    unsubscribe();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    expect(getPaletteOpen()).toBe(false);
  });
});
