import type { ReactElement } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { prerender } from 'react-dom/static';
import { act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { locales } from '~/i18n/locales';
import FeatureIsland from './features/FeatureIsland';
import { featureLoaders, featureModules } from './features/features';
import CommandPalette from './palette/CommandPalette';
import ToolIsland from './tools/ToolIsland';
import type { ModuleCache } from './module-cache';
import { toolLoaders, toolModules } from './tools/components';

async function renderStatic(element: ReactElement): Promise<string> {
  const { prelude } = await prerender(element);
  const reader = prelude.getReader();
  const decoder = new TextDecoder();
  let html = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return html + decoder.decode();
    html += decoder.decode(value, { stream: true });
  }
}

interface HydrationResult {
  html: string;
  container: HTMLElement;
  problems: string[];
}

const SAME_PROCESS_RENDERERS =
  /multiple renderers concurrently rendering the same context provider/;

let root: Root | null = null;

async function hydrate(
  element: () => ReactElement,
  modules?: { cache: ModuleCache; key: string },
): Promise<HydrationResult> {
  await modules?.cache.preload(modules.key);
  const html = await renderStatic(element());
  modules?.cache.reset();
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.append(container);
  const problems: string[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const message = args.map(String).join(' ');
    if (!SAME_PROCESS_RENDERERS.test(message)) problems.push(message);
  });
  await act(async () => {
    root = hydrateRoot(container, element(), {
      onRecoverableError: (error) => problems.push(String(error)),
    });
  });
  await act(async () => {
    await modules?.cache.preload(modules.key);
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  return { html, container, problems };
}

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('tools render at build time and hydrate without mismatches', () => {
  for (const locale of locales) {
    it.each(Object.keys(toolLoaders))(`%s (${locale})`, async (slug) => {
      const { html, container, problems } = await hydrate(
        () => <ToolIsland slug={slug} locale={locale} />,
        { cache: toolModules, key: slug },
      );
      expect(html).toContain('tool-root');
      expect(html).not.toContain('<template');
      expect(problems).toEqual([]);
      expect(container.querySelector('.tool-root button')).not.toBeNull();
    });
  }
});

describe('features render at build time and hydrate without mismatches', () => {
  it.each(Object.keys(featureLoaders))('%s', async (name) => {
    const { html, problems } = await hydrate(() => <FeatureIsland name={name} locale="es" />, {
      cache: featureModules,
      key: name,
    });
    expect(html).toContain('tool-root');
    expect(html).not.toContain('<template');
    expect(problems).toEqual([]);
  });

  it('command palette trigger', async () => {
    const { html, problems } = await hydrate(() => <CommandPalette locale="en" />);
    expect(html).toContain('Search');
    expect(problems).toEqual([]);
  });
});

describe('URL params apply right after hydration', () => {
  it('renders defaults at build time and the URL state once hydrated', async () => {
    window.history.replaceState(null, '', '/?mode=format&style=dash&input=12.345.678-5');
    const { html, container, problems } = await hydrate(
      () => <ToolIsland slug="rut" locale="en" />,
      { cache: toolModules, key: 'rut' },
    );
    const built = document.createElement('div');
    built.innerHTML = html;
    expect(built.querySelector('textarea[aria-label="Output"]')?.textContent).toBe('');
    expect(problems).toEqual([]);
    const output = container.querySelector<HTMLTextAreaElement>('textarea[aria-label="Output"]');
    expect(output?.value).toBe('12345678-5');
  });
});
