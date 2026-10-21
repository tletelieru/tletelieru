export type Separator = 'any' | 'newline';

export interface ParseValuesOptions {
  separator?: Separator;
  dedupe?: boolean;
  stripQuotes?: boolean;
}

export interface ValueStats {
  total: number;
  unique: number;
  duplicatesRemoved: number;
}

export interface ParsedValues {
  values: string[];
  stats: ValueStats;
}

const ANY_SEPARATOR = /\r\n|[\r\n,\t;]/;
const NEWLINE = /\r\n|[\r\n]/;
const QUOTES = ["'", '"', '`'];

export const emptyStats: ValueStats = { total: 0, unique: 0, duplicatesRemoved: 0 };

export function splitValues(input: string, separator: Separator = 'any'): string[] {
  return input
    .split(separator === 'newline' ? NEWLINE : ANY_SEPARATOR)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function stripSurroundingQuotes(value: string): string {
  if (value.length < 2) return value;
  const first = value[0];
  if (first !== value[value.length - 1] || !QUOTES.includes(first)) return value;
  return value
    .slice(1, -1)
    .split(first + first)
    .join(first);
}

export function dedupeValues(
  values: readonly string[],
  dedupe = true,
  key: (value: string) => string = (value) => value,
): ParsedValues {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const value of values) {
    const id = key(value);
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(value);
  }
  const result = dedupe ? unique : [...values];
  return {
    values: result,
    stats: {
      total: values.length,
      unique: unique.length,
      duplicatesRemoved: values.length - result.length,
    },
  };
}

export function parseValues(
  input: string,
  { separator = 'any', dedupe = true, stripQuotes = false }: ParseValuesOptions = {},
): ParsedValues {
  const raw = splitValues(input, separator);
  const values = stripQuotes ? raw.map(stripSurroundingQuotes).filter(Boolean) : raw;
  return dedupeValues(values, dedupe);
}
