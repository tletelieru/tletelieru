import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { toolComponents } from '~/components/tools/components';
import { categories, toolsByCategory, tools, withBase } from './registry';

const docsDir = `${resolve(process.cwd(), 'src/content/docs')}/`;

describe('tool registry', () => {
  it('has unique slugs', () => {
    const slugs = tools.map((tool) => tool.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it.each(tools.map((tool) => [tool.slug, tool]))('%s is fully wired', (_, tool) => {
    expect(categories.some((category) => category.id === tool.category)).toBe(true);
    expect(toolComponents[tool.slug]).toBeDefined();
    expect(existsSync(`${docsDir}tools/${tool.category}/${tool.slug}.mdx`)).toBe(true);
    expect(tool.keywords.length).toBeGreaterThan(0);
  });

  it('every component has a registry entry', () => {
    for (const slug of Object.keys(toolComponents)) {
      expect(tools.some((tool) => tool.slug === slug)).toBe(true);
    }
  });

  it('groups only non-empty categories', () => {
    for (const group of toolsByCategory()) expect(group.tools.length).toBeGreaterThan(0);
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
