import type { Locale } from '../../i18n/locales';
import type { Detection } from '../detect/detectors';
import { buildToolLink, type ToolLink } from '../handoff';
import { getTool, toolPath, withBase, type ToolMeta } from '../tools/registry';
import type { RecentEntry } from '../user-data/recent';
import type { Snippet } from '../user-data/snippets';
import { rankItems } from './fuzzy';
import { searchTools } from './tools';

export type PaletteSectionId =
  'detected' | 'favorites' | 'recent' | 'popular' | 'tools' | 'snippets' | 'more';

export type PaletteItem =
  | { kind: 'detection'; id: string; tool: ToolMeta; detection: Detection; link: ToolLink }
  | { kind: 'tool'; id: string; tool: ToolMeta; favorite: boolean; link: ToolLink }
  | { kind: 'snippet'; id: string; snippet: Snippet }
  | { kind: 'all'; id: string; link: ToolLink };

export interface PaletteSection {
  id: PaletteSectionId;
  items: PaletteItem[];
}

export interface PaletteInput {
  query: string;
  locale: Locale;
  base: string;
  favorites: readonly string[];
  recent: readonly RecentEntry[];
  snippets: readonly Snippet[];
  detections: readonly Detection[];
}

export const POPULAR_TOOLS = ['json', 'rut', 'unix', 'sql-in-text', 'timezone', 'case'];
export const TOOL_LIMIT = 8;
export const SNIPPET_LIMIT = 5;
export const DETECTION_LIMIT = 3;
const POPULAR_LIMIT = 5;

export function allToolsHref(base: string, locale: Locale): string {
  return withBase(base, `${locale}/tools/`);
}

export function searchSnippets(
  snippets: readonly Snippet[],
  query: string,
  limit = SNIPPET_LIMIT,
): Snippet[] {
  return rankItems(
    snippets,
    query,
    (snippet) => [
      { text: snippet.title, weight: 3 },
      ...snippet.tags.map((tag) => ({ text: tag, weight: 2 })),
      { text: snippet.content.slice(0, 2000), weight: 0.5 },
    ],
    limit,
  );
}

function resolveTools(slugs: Iterable<string>): ToolMeta[] {
  const result: ToolMeta[] = [];
  const seen = new Set<string>();
  for (const slug of slugs) {
    const tool = getTool(slug);
    if (tool && !seen.has(slug)) {
      seen.add(slug);
      result.push(tool);
    }
  }
  return result;
}

function nonEmpty(sections: PaletteSection[]): PaletteSection[] {
  return sections.filter((section) => section.items.length > 0);
}

export function buildPaletteSections({
  query,
  locale,
  base,
  favorites,
  recent,
  snippets,
  detections,
}: PaletteInput): PaletteSection[] {
  const favoriteSet = new Set(favorites);
  const toolItem = (section: PaletteSectionId, tool: ToolMeta): PaletteItem => ({
    kind: 'tool',
    id: `${section}:${tool.slug}`,
    tool,
    favorite: favoriteSet.has(tool.slug),
    link: buildToolLink(withBase(base, toolPath(tool, locale)), {}),
  });
  const more: PaletteSection = {
    id: 'more',
    items: [
      { kind: 'all', id: 'more:all', link: { href: allToolsHref(base, locale), handoff: null } },
    ],
  };

  if (!query.trim()) {
    const favoriteTools = resolveTools(favorites);
    const recentTools = resolveTools(recent.map((entry) => entry.slug));
    const shown = new Set([...favoriteTools, ...recentTools].map((tool) => tool.slug));
    const popular = resolveTools(POPULAR_TOOLS.filter((slug) => !shown.has(slug))).slice(
      0,
      POPULAR_LIMIT,
    );
    return nonEmpty([
      { id: 'favorites', items: favoriteTools.map((tool) => toolItem('favorites', tool)) },
      { id: 'recent', items: recentTools.map((tool) => toolItem('recent', tool)) },
      { id: 'popular', items: popular.map((tool) => toolItem('popular', tool)) },
      more,
    ]);
  }

  const detected: PaletteItem[] = [];
  for (const detection of detections.slice(0, DETECTION_LIMIT)) {
    const tool = getTool(detection.slug);
    if (!tool) continue;
    detected.push({
      kind: 'detection',
      id: `detected:${tool.slug}`,
      tool,
      detection,
      link: buildToolLink(
        withBase(base, toolPath(tool, locale)),
        detection.params,
        detection.sensitive ? 0 : undefined,
      ),
    });
  }

  return nonEmpty([
    { id: 'detected', items: detected },
    {
      id: 'tools',
      items: searchTools(query, locale, TOOL_LIMIT).map((tool) => toolItem('tools', tool)),
    },
    {
      id: 'snippets',
      items: searchSnippets(snippets, query).map((snippet) => ({
        kind: 'snippet',
        id: `snippets:${snippet.id}`,
        snippet,
      })),
    },
    more,
  ]);
}

export function flattenSections(sections: readonly PaletteSection[]): PaletteItem[] {
  return sections.flatMap((section) => section.items);
}

export function moveSelection(current: number, delta: number, count: number): number {
  if (count <= 0) return 0;
  return (((current + delta) % count) + count) % count;
}

export function truncate(text: string, max: number): string {
  const singleLine = text
    .slice(0, max * 4)
    .replace(/\s+/g, ' ')
    .trim();
  return singleLine.length > max ? `${singleLine.slice(0, max - 1)}…` : singleLine;
}
