import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

interface ManifestEntry {
  url: string;
  size: number;
  revision: string | null;
}

const PAGE_SCRIPT = /\/_astro\/([^"'\s]+\.js)/g;
const STATIC_IMPORT = /(?:from\s*|import\s*)["']\.\/([^"']+\.js)["']/g;
const ASTRO_CHUNK = /(?:^|\/)_astro\/([^/]+\.js)$/;

function captures(text: string, pattern: RegExp): string[] {
  return [...text.matchAll(pattern)].flatMap((match) => match[1] ?? []);
}

function staticClosure(roots: string[], imports: Record<string, string[]>): Set<string> {
  const seen = new Set<string>();
  const pending = [...roots];
  for (let chunk = pending.pop(); chunk !== undefined; chunk = pending.pop()) {
    if (seen.has(chunk)) continue;
    seen.add(chunk);
    pending.push(...(imports[chunk] ?? []));
  }
  return seen;
}

export function sharedChunks(
  pages: string[][],
  imports: Record<string, string[]>,
  minShare = 0.5,
): Set<string> {
  const counts = new Map<string, number>();
  for (const roots of pages) {
    for (const chunk of staticClosure(roots, imports)) {
      counts.set(chunk, (counts.get(chunk) ?? 0) + 1);
    }
  }
  const needed = pages.length * minShare;
  return new Set([...counts].filter(([, count]) => count >= needed).map(([chunk]) => chunk));
}

async function readImports(dist: string): Promise<Record<string, string[]>> {
  const directory = join(dist, '_astro');
  const files = (await readdir(directory)).filter((file) => file.endsWith('.js'));
  const entries = await Promise.all(
    files.map(async (file) => {
      const source = await readFile(join(directory, file), 'utf8');
      return [file, captures(source, STATIC_IMPORT)] as const;
    }),
  );
  return Object.fromEntries(entries);
}

async function readPages(dist: string): Promise<string[][]> {
  const files = await readdir(dist, { recursive: true });
  const pages = files.filter((file) => file.endsWith('index.html'));
  return Promise.all(
    pages.map(async (page) => captures(await readFile(join(dist, page), 'utf8'), PAGE_SCRIPT)),
  );
}

export function keepSharedChunks(dist: string) {
  return async (entries: ManifestEntry[]) => {
    const shared = sharedChunks(await readPages(dist), await readImports(dist));
    const manifest = entries.filter(({ url }) => {
      const chunk = url.match(ASTRO_CHUNK)?.[1];
      return chunk === undefined || shared.has(chunk);
    });
    return { manifest, warnings: [] };
  };
}
