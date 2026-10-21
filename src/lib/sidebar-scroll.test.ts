import { afterEach, describe, expect, it } from 'vitest';
import { SIDEBAR_STATE_KEY, nextSidebarState, saveSidebarScroll } from './sidebar-scroll';

describe('nextSidebarState', () => {
  it('keeps the open groups of the same sidebar and updates the scroll', () => {
    const stored = JSON.stringify({ hash: 'h1', open: [true, false], scroll: 10 });
    expect(nextSidebarState(stored, 'h1', 300)).toEqual({
      hash: 'h1',
      open: [true, false],
      scroll: 300,
    });
  });

  it('drops open groups from another sidebar or corrupt data', () => {
    expect(nextSidebarState(JSON.stringify({ hash: 'other', open: [true] }), 'h1', 5).open).toEqual(
      [],
    );
    expect(nextSidebarState('{nope', 'h1', 5)).toEqual({ hash: 'h1', open: [], scroll: 5 });
  });
});

describe('saveSidebarScroll', () => {
  afterEach(() => window.sessionStorage.clear());

  it('stores the state in the format Starlight restores', () => {
    const scroller = document.createElement('div');
    scroller.innerHTML = '<sl-sidebar-state-persist data-hash="abc"></sl-sidebar-state-persist>';
    Object.defineProperty(scroller, 'scrollTop', { value: 420 });
    saveSidebarScroll(scroller);
    expect(JSON.parse(window.sessionStorage.getItem(SIDEBAR_STATE_KEY) ?? '{}')).toEqual({
      hash: 'abc',
      open: [],
      scroll: 420,
    });
  });
});
