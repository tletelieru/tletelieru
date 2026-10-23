import { clampInt } from '../_shared/lines';
import type { ParseValuesOptions, Separator, ValueStats } from './values';

export type QuoteStyle = 'single' | 'double' | 'backtick' | 'none';
export type Layout = 'single' | 'multi';
export type Joiner = 'OR' | 'AND';

export const separators: readonly Separator[] = ['any', 'newline'];
export const quoteStyles: readonly QuoteStyle[] = ['single', 'double', 'backtick', 'none'];
export const layouts: readonly Layout[] = ['single', 'multi'];

export const MAX_BATCH = 100_000;

const QUOTE_CHARS: Record<QuoteStyle, string> = {
  single: "'",
  double: '"',
  backtick: '`',
  none: '',
};

const IDENTIFIER_PART = '(?:[\\p{L}_][\\p{L}\\p{N}_$]*|"(?:[^"]|"")+"|`(?:[^`]|``)+`)';
const IDENTIFIER = new RegExp(`^${IDENTIFIER_PART}(?:\\.${IDENTIFIER_PART})*$`, 'u');

export interface QuoteOptions {
  quote?: QuoteStyle;
  escape?: boolean;
}

export interface ClauseLayoutOptions {
  layout?: Layout;
  uppercase?: boolean;
}

export interface InClauseOptions extends ClauseLayoutOptions {
  column?: string;
  not?: boolean;
}

export interface BatchedInOptions extends InClauseOptions {
  batchSize?: number;
}

export interface CombineOptions extends ClauseLayoutOptions {
  joiner: Joiner | null;
  wrap?: boolean;
}

export interface ResolvedSqlOptions {
  parse: ParseValuesOptions;
  quote: QuoteStyle;
  escape: boolean;
  layout: Layout;
  batchSize: number;
  uppercase: boolean;
}

export type SqlToolError =
  | { code: 'columnRequired' }
  | { code: 'invalidColumn'; column: string }
  | { code: 'pathRequired' }
  | { code: 'invalidPath'; path: string }
  | { code: 'invalidNumbers'; values: string[] }
  | { code: 'fieldRequired' }
  | { code: 'invalidField'; field: string };

export interface SqlToolResult {
  output: string;
  error: SqlToolError | null;
  stats: ValueStats;
}

export const sqlOptionDefaults = {
  sep: 'any',
  dedupe: true,
  strip: false,
  quote: 'single',
  escape: true,
  layout: 'single',
  batch: 0,
  upper: true,
};

export type SqlOptionState = typeof sqlOptionDefaults;

export function pickOption<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return allowed.find((option) => option === value) ?? fallback;
}

export function resolveSqlOptions(state: SqlOptionState): ResolvedSqlOptions {
  return {
    parse: {
      separator: pickOption(state.sep, separators, 'any'),
      dedupe: state.dedupe,
      stripQuotes: state.strip,
    },
    quote: pickOption(state.quote, quoteStyles, 'single'),
    escape: state.escape,
    layout: pickOption(state.layout, layouts, 'single'),
    batchSize: clampInt(state.batch, 0, MAX_BATCH),
    uppercase: state.upper,
  };
}

export const defaultSqlOptions: ResolvedSqlOptions = resolveSqlOptions(sqlOptionDefaults);

export function keyword(word: string, uppercase = true): string {
  return uppercase ? word.toUpperCase() : word.toLowerCase();
}

export function quoteValue(value: string, { quote = 'single', escape = true }: QuoteOptions = {}) {
  const char = QUOTE_CHARS[quote];
  if (!char) return value;
  const body = escape ? value.split(char).join(char + char) : value;
  return `${char}${body}${char}`;
}

export function sqlString(value: string, escape = true): string {
  return quoteValue(value, { quote: 'single', escape });
}

export function isValidIdentifier(name: string): boolean {
  return IDENTIFIER.test(name);
}

export function columnError(column: string, required = false): SqlToolError | null {
  const name = column.trim();
  if (!name) return required ? { code: 'columnRequired' } : null;
  return isValidIdentifier(name) ? null : { code: 'invalidColumn', column: name };
}

export function previewValues(
  values: readonly string[],
  max = 5,
): { shown: string[]; hidden: number } {
  return { shown: values.slice(0, max), hidden: Math.max(0, values.length - max) };
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (!items.length) return [];
  const step = Math.trunc(size);
  if (!(step > 0)) return [[...items]];
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += step) {
    batches.push(items.slice(index, index + step));
  }
  return batches;
}

export function indent(text: string, prefix = '  '): string {
  return text
    .split('\n')
    .map((line) => (line ? `${prefix}${line}` : line))
    .join('\n');
}

export function wrapList(
  items: readonly string[],
  open: string,
  close: string,
  layout: Layout = 'single',
): string {
  if (!items.length) return `${open}${close}`;
  if (layout === 'multi') return `${open}\n${indent(items.join(',\n'))}\n${close}`;
  return `${open}${items.join(', ')}${close}`;
}

export function inClause(
  items: readonly string[],
  { column = '', not = false, layout = 'single', uppercase = true }: InClauseOptions = {},
): string {
  const name = column.trim();
  const operator = keyword(not ? 'NOT IN' : 'IN', uppercase);
  return `${name ? `${name} ` : ''}${operator} ${wrapList(items, '(', ')', layout)}`;
}

export function combineClauses(
  clauses: readonly string[],
  { joiner, layout = 'single', uppercase = true, wrap = true }: CombineOptions,
): string {
  if (clauses.length <= 1) return clauses[0] ?? '';
  if (!joiner) return clauses.join('\n\n');
  const word = keyword(joiner, uppercase);
  if (layout === 'multi') {
    const body = clauses.join(`\n${word} `);
    return wrap ? `(\n${indent(body)}\n)` : body;
  }
  const body = clauses.join(` ${word} `);
  return wrap ? `(${body})` : body;
}

export function batchedInClause(
  items: readonly string[],
  { batchSize = 0, ...options }: BatchedInOptions = {},
): string {
  if (!items.length) return '';
  const clauses = chunk(items, batchSize).map((batch) => inClause(batch, options));
  const joiner = options.column?.trim() ? (options.not ? 'AND' : 'OR') : null;
  return combineClauses(clauses, {
    joiner,
    layout: options.layout,
    uppercase: options.uppercase,
  });
}
