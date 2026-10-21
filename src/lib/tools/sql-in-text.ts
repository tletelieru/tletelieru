import {
  batchedInClause,
  columnError,
  defaultSqlOptions,
  quoteValue,
  type ResolvedSqlOptions,
  type SqlToolResult,
} from './sql/format';
import { parseValues } from './sql/values';

export interface SqlInTextOptions extends ResolvedSqlOptions {
  column: string;
  not: boolean;
}

export function buildSqlInText(
  input: string,
  options: Partial<SqlInTextOptions> = {},
): SqlToolResult {
  const { column, not, parse, quote, escape, layout, batchSize, uppercase } = {
    ...defaultSqlOptions,
    column: '',
    not: false,
    ...options,
  };
  const { values, stats } = parseValues(input, parse);
  if (!values.length) return { output: '', error: null, stats };
  const error = columnError(column);
  if (error) return { output: '', error, stats };
  const items = values.map((value) => quoteValue(value, { quote, escape }));
  return {
    output: batchedInClause(items, { column, not, layout, batchSize, uppercase }),
    error: null,
    stats,
  };
}
