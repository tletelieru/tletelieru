import {
  chunk,
  columnError,
  combineClauses,
  defaultSqlOptions,
  indent,
  keyword,
  quoteValue,
  sqlString,
  wrapList,
  type Layout,
  type ResolvedSqlOptions,
  type SqlToolResult,
} from './sql/format';
import { parseValues } from './sql/values';

export type ListWrapper = 'plain' | 'parens' | 'array' | 'any' | 'literal' | 'values';

export const listWrappers: readonly ListWrapper[] = [
  'plain',
  'parens',
  'array',
  'any',
  'literal',
  'values',
];

export interface SqlListOptions extends ResolvedSqlOptions {
  wrapper: ListWrapper;
  column: string;
}

export interface WrapBatchOptions {
  column?: string;
  layout?: Layout;
  uppercase?: boolean;
  escape?: boolean;
}

const PG_ARRAY_BARE = /^[^\s{}",\\]+$/;

export function pgArrayElement(value: string): string {
  if (PG_ARRAY_BARE.test(value) && value.toUpperCase() !== 'NULL') return value;
  return `"${value.replace(/[\\"]/g, '\\$&')}"`;
}

export function pgArrayLiteral(values: readonly string[], escape = true): string {
  return sqlString(`{${values.map(pgArrayElement).join(',')}}`, escape);
}

function plainList(items: readonly string[], layout: Layout): string {
  return items.join(layout === 'multi' ? ',\n' : ', ');
}

function valuesList(items: readonly string[], layout: Layout, uppercase: boolean): string {
  const rows = items.map((item) => `(${item})`);
  const word = keyword('VALUES', uppercase);
  if (layout === 'multi') return `${word}\n${indent(rows.join(',\n'))}`;
  return `${word} ${rows.join(', ')}`;
}

export function wrapBatch(
  values: readonly string[],
  items: readonly string[],
  wrapper: ListWrapper,
  { column = '', layout = 'single', uppercase = true, escape = true }: WrapBatchOptions = {},
): string {
  const array = `${keyword('ARRAY', uppercase)}${wrapList(items, '[', ']', layout)}`;
  if (wrapper === 'plain') return plainList(items, layout);
  if (wrapper === 'parens') return wrapList(items, '(', ')', layout);
  if (wrapper === 'array') return array;
  if (wrapper === 'literal') return pgArrayLiteral(values, escape);
  if (wrapper === 'values') return valuesList(items, layout, uppercase);
  const name = column.trim();
  return `${name ? `${name} ` : ''}= ${keyword('ANY', uppercase)}(${array})`;
}

export function buildSqlList(input: string, options: Partial<SqlListOptions> = {}): SqlToolResult {
  const { wrapper, column, parse, quote, escape, layout, batchSize, uppercase } = {
    ...defaultSqlOptions,
    wrapper: 'parens' as ListWrapper,
    column: '',
    ...options,
  };
  const { values, stats } = parseValues(input, parse);
  if (!values.length) return { output: '', error: null, stats };
  const usesColumn = wrapper === 'any';
  const error = usesColumn ? columnError(column) : null;
  if (error) return { output: '', error, stats };
  const batches = chunk(values, batchSize).map((batch) =>
    wrapBatch(
      batch,
      batch.map((value) => quoteValue(value, { quote, escape })),
      wrapper,
      { column, layout, uppercase, escape },
    ),
  );
  const joiner = usesColumn && column.trim() ? 'OR' : null;
  return { output: combineClauses(batches, { joiner, layout, uppercase }), error: null, stats };
}
