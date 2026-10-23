export const regexFlags = ['g', 'i', 'm', 's', 'u', 'y'] as const;
export type RegexFlag = (typeof regexFlags)[number];

export const MAX_MATCHES = 1000;
export const TIME_BUDGET_MS = 250;

export interface RegexGroup {
  index: number;
  name: string | null;
  value: string | null;
}

export interface RegexMatch {
  index: number;
  end: number;
  text: string;
  groups: RegexGroup[];
  named: RegexGroup[];
}

export type RegexError =
  { code: 'patternRequired' } | { code: 'invalidPattern'; message: string } | { code: 'risky' };

export interface RegexRun {
  matches: RegexMatch[];
  truncated: boolean;
  timedOut: boolean;
  replaced: string | null;
}

export type RegexResult = { ok: true; run: RegexRun } | { ok: false; error: RegexError };

export interface RegexOptions {
  flags: string;
  replacement: string | null;
  allowRisky: boolean;
  maxMatches: number;
  timeBudgetMs: number;
  clock: () => number;
}

const NESTED_QUANTIFIER =
  /\((?:[^()\\]|\\.)*(?:[+*]|\{\d+,\d*\})(?:[^()\\]|\\.)*\)(?:[+*]|\{\d+,\d*\})/;
const BACKREFERENCE_LOOP = /\\[1-9].*[+*]/;

export function normalizeFlags(flags: string): string {
  return regexFlags.filter((flag) => flags.includes(flag)).join('');
}

export function isRiskyPattern(pattern: string): boolean {
  return NESTED_QUANTIFIER.test(pattern) || BACKREFERENCE_LOOP.test(pattern);
}

export function compileRegex(
  pattern: string,
  flags: string,
): { ok: true; regex: RegExp } | { ok: false; error: RegexError } {
  if (!pattern) return { ok: false, error: { code: 'patternRequired' } };
  try {
    return { ok: true, regex: new RegExp(pattern, normalizeFlags(flags)) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: { code: 'invalidPattern', message } };
  }
}

function toMatch(match: RegExpExecArray): RegexMatch {
  return {
    index: match.index,
    end: match.index + match[0].length,
    text: match[0],
    groups: match
      .slice(1)
      .map((value, offset) => ({ index: offset + 1, name: null, value: value ?? null })),
    named: Object.entries(match.groups ?? {}).map(([name, value]) => ({
      index: 0,
      name,
      value: value ?? null,
    })),
  };
}

function nextIndex(text: string, index: number, unicode: boolean): number {
  const code = text.codePointAt(index) ?? 0;
  return index + (unicode && code > 0xffff ? 2 : 1);
}

export function runRegex(
  pattern: string,
  text: string,
  options: Partial<RegexOptions> = {},
): RegexResult {
  const {
    flags = 'g',
    replacement = null,
    allowRisky = false,
    maxMatches = MAX_MATCHES,
    timeBudgetMs = TIME_BUDGET_MS,
    clock = () => Date.now(),
  } = options;
  const compiled = compileRegex(pattern, flags);
  if (!compiled.ok) return compiled;
  if (!allowRisky && isRiskyPattern(pattern)) return { ok: false, error: { code: 'risky' } };
  const { regex } = compiled;
  const matches: RegexMatch[] = [];
  let truncated = false;
  let timedOut = false;
  const started = clock();
  if (regex.global || regex.sticky) {
    regex.lastIndex = 0;
    for (let match = regex.exec(text); match; match = regex.exec(text)) {
      matches.push(toMatch(match));
      if (match[0] === '') regex.lastIndex = nextIndex(text, match.index, regex.unicode);
      if (matches.length >= maxMatches) {
        truncated = regex.exec(text) !== null;
        break;
      }
      if (clock() - started > timeBudgetMs) {
        timedOut = true;
        break;
      }
    }
  } else {
    const match = regex.exec(text);
    if (match) matches.push(toMatch(match));
  }
  regex.lastIndex = 0;
  const replaced = replacement === null || timedOut ? null : text.replace(regex, replacement);
  return { ok: true, run: { matches, truncated, timedOut, replaced } };
}

export interface HighlightSegment {
  text: string;
  match: number | null;
}

export function highlightSegments(
  text: string,
  matches: readonly RegexMatch[],
): HighlightSegment[] {
  const segments: HighlightSegment[] = [];
  let cursor = 0;
  matches.forEach((match, index) => {
    if (match.end <= cursor && match.text !== '') return;
    if (match.index > cursor) segments.push({ text: text.slice(cursor, match.index), match: null });
    if (match.text !== '') segments.push({ text: match.text, match: index });
    cursor = Math.max(cursor, match.end);
  });
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: null });
  return segments;
}

export function describeMatches(matches: readonly RegexMatch[]): string {
  return matches
    .map((match, index) => {
      const head = `#${index + 1} [${match.index}–${match.end}] ${JSON.stringify(match.text)}`;
      const groups = [...match.groups, ...match.named].map(
        (group) =>
          `  ${group.name ? `$<${group.name}>` : `$${group.index}`} = ${
            group.value === null ? 'undefined' : JSON.stringify(group.value)
          }`,
      );
      return [head, ...groups].join('\n');
    })
    .join('\n');
}
