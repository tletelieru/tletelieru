import type { Locale } from '~/i18n/locales';
import { getTool, toolHref } from '~/lib/tools/registry';

export const SHORTCUT_LIMIT = 8;

export interface ShortcutLink {
  slug: string;
  name: string;
  href: string;
}

export function resolveLinks(
  slugs: readonly string[],
  locale: Locale,
  base: string,
  limit = SHORTCUT_LIMIT,
): ShortcutLink[] {
  const links: ShortcutLink[] = [];
  const seen = new Set<string>();
  for (const slug of slugs) {
    if (links.length >= limit) break;
    const tool = getTool(slug);
    if (!tool || seen.has(slug)) continue;
    seen.add(slug);
    links.push({ slug, name: tool.name[locale], href: toolHref(base, locale, tool) });
  }
  return links;
}

function normalizePath(path: string): string {
  return (path.split(/[?#]/)[0] ?? '').replace(/\/+$/, '');
}

export function isCurrentPath(href: string, pathname: string): boolean {
  return normalizePath(href) === normalizePath(pathname);
}
