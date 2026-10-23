import { JSONPath } from 'jsonpath-plus';
import { parseJsonValue, type JsonError } from './json';

export type JsonPathView = 'values' | 'paths' | 'pointers';

export const jsonPathViews: readonly JsonPathView[] = ['values', 'paths', 'pointers'];

export interface JsonPathMatch {
  path: string;
  pointer: string;
  value: unknown;
}

export type JsonPathSyntax =
  | { reason: 'root' }
  | { reason: 'unbalanced'; char: string; position: number }
  | { reason: 'unclosed'; char: string; position: number }
  | { reason: 'engine'; message: string };

export type JsonPathError =
  | { code: 'invalidJson'; error: JsonError }
  | { code: 'pathRequired' }
  | ({ code: 'invalidPath' } & JsonPathSyntax);

export type JsonPathResult =
  { ok: true; matches: JsonPathMatch[] } | { ok: false; error: JsonPathError };

const PAIRS: Record<string, string> = { ']': '[', ')': '(' };

export function checkPathSyntax(path: string): JsonPathSyntax | null {
  if (!path.startsWith('$')) return { reason: 'root' };
  const stack: { char: string; position: number }[] = [];
  let quote: string | null = null;
  let quoteStart = 0;
  for (let index = 0; index < path.length; index++) {
    const char = path[index] ?? '';
    if (quote) {
      if (char === '\\') index++;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      quoteStart = index + 1;
      continue;
    }
    if (char === '[' || char === '(') {
      stack.push({ char, position: index + 1 });
      continue;
    }
    const open = PAIRS[char];
    if (open) {
      const last = stack.pop();
      if (!last || last.char !== open) return { reason: 'unbalanced', char, position: index + 1 };
    }
  }
  if (quote) return { reason: 'unclosed', char: quote, position: quoteStart };
  const unclosed = stack.pop();
  if (unclosed) return { reason: 'unclosed', ...unclosed };
  return null;
}

export function queryJsonPath(input: string, rawPath: string): JsonPathResult {
  const path = rawPath.trim();
  if (!path) return { ok: false, error: { code: 'pathRequired' } };
  const syntax = checkPathSyntax(path);
  if (syntax) return { ok: false, error: { code: 'invalidPath', ...syntax } };
  const parsed = parseJsonValue(input);
  if (!parsed.ok) return { ok: false, error: { code: 'invalidJson', error: parsed.error } };
  try {
    const results = JSONPath({
      path,
      json: parsed.value,
      resultType: 'all',
      wrap: true,
      eval: 'safe',
    }) as { path: string; pointer: string; value: unknown }[];
    return {
      ok: true,
      matches: results.map(({ path: match, pointer, value }) => ({ path: match, pointer, value })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: { code: 'invalidPath', reason: 'engine', message } };
  }
}

export function renderMatches(
  matches: readonly JsonPathMatch[],
  view: JsonPathView,
  indent = 2,
): string {
  if (view === 'paths') return matches.map((match) => match.path).join('\n');
  if (view === 'pointers') return matches.map((match) => match.pointer).join('\n');
  return JSON.stringify(
    matches.map((match) => match.value),
    null,
    indent,
  );
}
