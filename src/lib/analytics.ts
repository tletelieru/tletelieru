export const GOATCOUNTER_ENDPOINT = 'https://kamomilian.goatcounter.com/count';

export type ToolEvent = 'used' | 'copied';

interface GoatCounter {
  count?: (vars: { path: string; title?: string; event?: boolean }) => void;
}

const usedThisVisit = new Set<string>();

export function trackToolEvent(event: ToolEvent, slug: string | null): void {
  if (!slug || typeof window === 'undefined') return;
  if (event === 'used') {
    if (usedThisVisit.has(slug)) return;
    usedThisVisit.add(slug);
  }
  const counter = (window as Window & { goatcounter?: GoatCounter }).goatcounter;
  counter?.count?.({ path: `tool-${event}/${slug}`, title: slug, event: true });
}

export function resetToolEvents(): void {
  usedThisVisit.clear();
}
