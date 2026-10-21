import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { toolLoaders } from '~/components/tools/components';
import { locales } from '~/i18n/locales';
import { categories, toolPath, toolsByCategory, tools, withBase } from './registry';

const docsDir = `${resolve(process.cwd(), 'src/content/docs')}/`;

describe('tool registry', () => {
  it('has unique slugs', () => {
    const slugs = tools.map((tool) => tool.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it.each(tools.map((tool) => [tool.slug, tool]))('%s is fully wired', (_, tool) => {
    expect(categories.some((category) => category.id === tool.category)).toBe(true);
    expect(toolLoaders[tool.slug]).toBeDefined();
    expect(tool.keywords.length).toBeGreaterThan(0);
    for (const locale of locales) {
      expect(tool.name[locale].trim()).not.toBe('');
      expect(tool.description[locale].trim()).not.toBe('');
      expect(existsSync(`${docsDir}${locale}/tools/${tool.category}/${tool.slug}.mdx`)).toBe(true);
    }
  });

  it('every component has a registry entry', () => {
    for (const slug of Object.keys(toolLoaders)) {
      expect(tools.some((tool) => tool.slug === slug)).toBe(true);
    }
  });

  it('groups only non-empty categories', () => {
    for (const group of toolsByCategory('en')) expect(group.tools.length).toBeGreaterThan(0);
  });

  it('builds locale-prefixed paths', () => {
    expect(toolPath(tools[0], 'es')).toBe(`es/tools/${tools[0].category}/${tools[0].slug}/`);
  });
});

describe('withBase', () => {
  it.each([
    ['/tletelieru', 'tools/', '/tletelieru/tools/'],
    ['/tletelieru/', '/tools/', '/tletelieru/tools/'],
    ['/', 'tools/', '/tools/'],
  ])('joins %s + %s', (base, path, expected) => {
    expect(withBase(base, path)).toBe(expected);
  });
});
