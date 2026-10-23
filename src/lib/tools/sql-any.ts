import { pgArrayLiteral } from './sql-list';
import {
  chunk,
  columnError,
  combineClauses,
  defaultSqlOptions,
  keyword,
  sqlString,
  wrapList,
  type ResolvedSqlOptions,
  type SqlToolError,
} from './sql/format';
import { dedupeValues, parseValues, type ValueStats } from './sql/values';

export type AnyStyle = 'array' | 'literal';
export type AnyType = 'text' | 'int' | 'bigint' | 'uuid';

export const anyStyles: readonly AnyStyle[] = ['array', 'literal'];
export const anyTypes: readonly AnyType[] = ['text', 'int', 'bigint', 'uuid'];

export interface SqlAnyOptions extends ResolvedSqlOptions {
  column: string;
  style: AnyStyle;
  type: AnyType;
  not: boolean;
}

export type SqlAnyError = SqlToolError | { code: 'invalidValues'; type: AnyType; values: string[] };

export interface SqlAnyResult {
  output: string;
  error: SqlAnyError | null;
  stats: ValueStats;
}

const INTEGER = /^-?\d+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INT_RANGE = 2_147_483_648n;
const BIGINT_RANGE = 9_223_372_036_854_775_808n;

export function isAnyValue(value: string, type: AnyType): boolean {
  if (type === 'text') return true;
  if (type === 'uuid') return UUID.test(value);
  if (!INTEGER.test(value)) return false;
  const number = BigInt(value);
  const limit = type === 'int' ? INT_RANGE : BIGINT_RANGE;
  return number >= -limit && number < limit;
}

function normalize(value: string, type: AnyType): string {
  if (type === 'uuid') return value.toLowerCase();
  if (type === 'int' || type === 'bigint') return BigInt(value).toString();
  return value;
}

function arrayExpression(
  values: readonly string[],
  { type, escape, layout, uppercase }: SqlAnyOptions,
): string {
  if (type === 'int' || type === 'bigint') {
    const array = `${keyword('ARRAY', uppercase)}${wrapList(values, '[', ']', layout)}`;
    return type === 'bigint' ? `${array}::bigint[]` : array;
  }
  const items = values.map((value) => sqlString(value, escape));
  const array = `${keyword('ARRAY', uppercase)}${wrapList(items, '[', ']', layout)}`;
  return type === 'uuid' ? `${array}::uuid[]` : array;
}

export function anyClause(values: readonly string[], options: SqlAnyOptions): string {
  const { column, style, type, not, escape, uppercase } = options;
  const array =
    style === 'literal'
      ? `${pgArrayLiteral(values, escape)}::${type}[]`
      : arrayExpression(values, options);
  const name = column.trim();
  const operator = not ? `<> ${keyword('ALL', uppercase)}` : `= ${keyword('ANY', uppercase)}`;
  return `${name ? `${name} ` : ''}${operator}(${array})`;
}

export function buildSqlAny(input: string, partial: Partial<SqlAnyOptions> = {}): SqlAnyResult {
  const options: SqlAnyOptions = {
    ...defaultSqlOptions,
    column: '',
    style: 'array',
    type: 'text',
    not: false,
    ...partial,
  };
  const { parse, type, column, not, batchSize, layout, uppercase } = options;
  const { values: raw } = parseValues(input, { ...parse, dedupe: false });
  const valid = raw
    .filter((value) => isAnyValue(value, type))
    .map((value) => normalize(value, type));
  const invalid = raw.filter((value) => !isAnyValue(value, type));
  const { values, stats } = dedupeValues(valid, parse.dedupe !== false);
  if (!raw.length) return { output: '', error: null, stats };
  const nameError = columnError(column);
  if (nameError) return { output: '', error: nameError, stats };
  const clauses = chunk(values, batchSize).map((batch) => anyClause(batch, options));
  const joiner = column.trim() ? (not ? 'AND' : 'OR') : null;
  return {
    output: combineClauses(clauses, { joiner, layout, uppercase }),
    error: invalid.length > 0 ? { code: 'invalidValues', type, values: invalid } : null,
    stats,
  };
}
