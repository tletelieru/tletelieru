export interface SidebarShortcutsConfig {
  index: Record<string, { name: string; href: string }>;
  labels: { favorites: string; recent: string; clear: string; clearRecent: string };
  limit: number;
  favoritesKey: string;
  recentKey: string;
  sectionsKey: string;
  event: string;
}

export function mountSidebarShortcuts(container: HTMLElement, config: SidebarShortcutsConfig): void;
