import {
  batchedInClause,
  columnError,
  defaultSqlOptions,
  type ResolvedSqlOptions,
  type SqlToolResult,
} from './sql/format';
import { dedupeValues, parseValues } from './sql/values';

export interface SqlInNumbersOptions extends ResolvedSqlOptions {
  column: string;
  not: boolean;
  sort: boolean;
}

const NUMBER = /^-?(?:\d+(?:\.\d+)?|\.\d+)$/;

export function isSqlNumber(value: string): boolean {
  return NUMBER.test(value);
}

export function buildSqlInNumbers(
  input: string,
  options: Partial<SqlInNumbersOptions> = {},
): SqlToolResult {
  const { column, not, sort, parse, layout, batchSize, uppercase } = {
    ...defaultSqlOptions,
    column: '',
    not: false,
    sort: false,
    ...options,
  };
  const { values: raw } = parseValues(input, { ...parse, dedupe: false });
  const valid = raw.filter(isSqlNumber);
  const invalid = raw.filter((value) => !isSqlNumber(value));
  const { values, stats } = dedupeValues(valid, parse.dedupe !== false, (value) =>
    String(Number(value)),
  );
  if (!raw.length) return { output: '', error: null, stats };
  const nameError = columnError(column);
  if (nameError) return { output: '', error: nameError, stats };
  const ordered = sort ? [...values].sort((a, b) => Number(a) - Number(b)) : values;
  return {
    output: batchedInClause(ordered, { column, not, layout, batchSize, uppercase }),
    error: invalid.length ? { code: 'invalidNumbers', values: invalid } : null,
    stats,
  };
}
