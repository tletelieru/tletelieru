export const SIDEBAR_STATE_KEY = 'sl-sidebar-state';

interface SidebarState {
  hash: string;
  open: boolean[];
  scroll: number;
}

interface MinimalStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function nextSidebarState(
  stored: string | null,
  hash: string,
  scroll: number,
): SidebarState {
  let open: boolean[] = [];
  try {
    const parsed: unknown = JSON.parse(stored ?? '{}');
    if (typeof parsed === 'object' && parsed !== null) {
      const state = parsed as Partial<SidebarState>;
      if (state.hash === hash && Array.isArray(state.open)) open = state.open;
    }
  } catch {
    open = [];
  }
  return { hash, open, scroll };
}

function sessionStore(): MinimalStorage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveSidebarScroll(
  scroller: HTMLElement,
  storage: MinimalStorage | null = sessionStore(),
): void {
  if (!storage) return;
  const hash = scroller.querySelector<HTMLElement>('sl-sidebar-state-persist')?.dataset.hash ?? '';
  try {
    const state = nextSidebarState(storage.getItem(SIDEBAR_STATE_KEY), hash, scroller.scrollTop);
    storage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(state));
  } catch {
    return;
  }
}
