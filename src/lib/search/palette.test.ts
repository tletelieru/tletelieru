import { describe, expect, it } from 'vitest';
import { detectInput } from '../detect';
import type { Snippet } from '../user-data/snippets';
import {
  buildPaletteSections,
  flattenSections,
  moveSelection,
  POPULAR_TOOLS,
  searchSnippets,
  truncate,
  type PaletteInput,
} from './palette';

const snippet = (id: string, title: string, content: string, tags: string[] = []): Snippet => ({
  id,
  title,
  content,
  tags,
  createdAt: 0,
  updatedAt: 0,
});

const base: PaletteInput = {
  query: '',
  locale: 'en',
  base: '/tletelieru/',
  favorites: [],
  recent: [],
  snippets: [],
  detections: [],
};

describe('buildPaletteSections', () => {
  it('shows popular tools and the all-tools link for an empty query', () => {
    const sections = buildPaletteSections(base);
    expect(sections.map((section) => section.id)).toEqual(['popular', 'more']);
    expect(sections[1].items[0]).toEqual({
      kind: 'all',
      id: 'more:all',
      link: { href: '/tletelieru/en/tools/', handoff: null },
    });
  });

  it('lists favorites and recent first, skipping unknown slugs and duplicates in popular', () => {
    const sections = buildPaletteSections({
      ...base,
      favorites: ['json', 'missing'],
      recent: [{ slug: 'rut', at: 1 }],
    });
    expect(sections.map((section) => section.id)).toEqual([
      'favorites',
      'recent',
      'popular',
      'more',
    ]);
    const popular = sections[2].items.map((item) => (item.kind === 'tool' ? item.tool.slug : ''));
    expect(popular).not.toContain('json');
    expect(popular).not.toContain('rut');
    expect(popular.length).toBeLessThanOrEqual(POPULAR_TOOLS.length);
    expect(sections[0].items[0]).toMatchObject({ kind: 'tool', favorite: true });
  });

  it('puts detections first with prefilled hrefs when there is a query', () => {
    const query = '12.345.678-5';
    const sections = buildPaletteSections({ ...base, query, detections: detectInput(query) });
    const [first] = flattenSections(sections);
    expect(first.kind).toBe('detection');
    expect(first.kind === 'detection' && first.link).toEqual({
      href: '/tletelieru/en/tools/ids/rut/?input=12.345.678-5&mode=validate',
      handoff: null,
    });
  });

  it('hands off large detected input instead of putting it in the URL', () => {
    const query = JSON.stringify({ data: 'x'.repeat(5000) });
    const sections = buildPaletteSections({ ...base, query, detections: detectInput(query) });
    const [first] = flattenSections(sections);
    expect(first.kind === 'detection' && first.link).toEqual({
      href: '/tletelieru/en/tools/data/json/?handoff=1',
      handoff: { input: query },
    });
  });

  it('ranks tools, marks favorites and appends snippets and the all-tools link', () => {
    const sections = buildPaletteSections({
      ...base,
      locale: 'es',
      query: 'json',
      favorites: ['json'],
      snippets: [snippet('a', 'JSON sample', '{}'), snippet('b', 'Other', 'x')],
    });
    expect(sections.map((section) => section.id)).toEqual(['tools', 'snippets', 'more']);
    const firstTool = sections[0].items[0];
    expect(firstTool).toMatchObject({ kind: 'tool', favorite: true });
    expect(firstTool.kind === 'tool' && firstTool.link.href).toBe(
      '/tletelieru/es/tools/data/json/',
    );
    expect(sections[1].items).toHaveLength(1);
  });

  it('returns only the all-tools link when nothing matches', () => {
    const sections = buildPaletteSections({ ...base, query: 'zzzzqqq' });
    expect(sections.map((section) => section.id)).toEqual(['more']);
  });
});

describe('searchSnippets', () => {
  it('matches title, tags and content', () => {
    const list = [
      snippet('1', 'Deploy', 'kubectl rollout', ['k8s']),
      snippet('2', 'Query', 'select * from users'),
    ];
    expect(searchSnippets(list, 'k8s').map((item) => item.id)).toEqual(['1']);
    expect(searchSnippets(list, 'users').map((item) => item.id)).toEqual(['2']);
    expect(searchSnippets(list, 'query').map((item) => item.id)).toEqual(['2']);
  });
});

describe('moveSelection', () => {
  it('wraps around', () => {
    expect(moveSelection(0, -1, 3)).toBe(2);
    expect(moveSelection(2, 1, 3)).toBe(0);
    expect(moveSelection(0, 1, 0)).toBe(0);
  });
});

describe('truncate', () => {
  it('collapses whitespace and adds an ellipsis', () => {
    expect(truncate('a\n b', 10)).toBe('a b');
    expect(truncate('abcdefghij', 5)).toBe('abcd…');
  });
});
