export const HANDOFF_PARAM = 'handoff';
export const HANDOFF_KEY = 'tl:handoff';
export const HANDOFF_THRESHOLD = 4000;

export type HandoffParams = Record<string, string>;

export interface ToolLink {
  href: string;
  handoff: HandoffParams | null;
}

interface MinimalStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function buildToolLink(
  path: string,
  params: HandoffParams,
  threshold = HANDOFF_THRESHOLD,
): ToolLink {
  const size = Object.values(params).reduce((total, value) => total + value.length, 0);
  if (size <= threshold) {
    const query = new URLSearchParams(params).toString();
    return { href: query ? `${path}?${query}` : path, handoff: null };
  }
  return { href: `${path}?${HANDOFF_PARAM}=1`, handoff: params };
}

function sessionStore(): MinimalStorage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function storeHandoff(
  params: HandoffParams,
  storage: MinimalStorage | null = sessionStore(),
): void {
  try {
    storage?.setItem(HANDOFF_KEY, JSON.stringify(params));
  } catch {
    return;
  }
}

export function followToolLink(link: ToolLink): void {
  if (link.handoff) storeHandoff(link.handoff);
  window.location.assign(link.href);
}

export function takeHandoff(
  search: string,
  storage: MinimalStorage | null = sessionStore(),
): HandoffParams | null {
  if (!new URLSearchParams(search).has(HANDOFF_PARAM) || !storage) return null;
  try {
    const raw = storage.getItem(HANDOFF_KEY);
    storage.removeItem(HANDOFF_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    const result: HandoffParams = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string') result[key] = value;
    }
    return result;
  } catch {
    return null;
  }
}

export function withoutHandoffParam(search: string): string {
  const params = new URLSearchParams(search);
  params.delete(HANDOFF_PARAM);
  const query = params.toString();
  return query ? `?${query}` : '';
}
