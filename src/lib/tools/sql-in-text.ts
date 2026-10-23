import {
  batchedInClause,
  columnError,
  defaultSqlOptions,
  quoteValue,
  type ResolvedSqlOptions,
  type SqlToolResult,
} from './sql/format';
import { mongoFieldError, mongoInFilters, type MongoStyle } from './mongo/filter';
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

export interface MongoInTextOptions {
  field: string;
  not: boolean;
  parse: ResolvedSqlOptions['parse'];
  batchSize: number;
  style: MongoStyle;
}

export function buildMongoInText(
  input: string,
  options: Partial<MongoInTextOptions> = {},
): SqlToolResult {
  const { field, not, parse, batchSize, style } = {
    field: '',
    not: false,
    parse: defaultSqlOptions.parse,
    batchSize: 0,
    style: 'pretty' as MongoStyle,
    ...options,
  };
  const { values, stats } = parseValues(input, parse);
  if (!values.length) return { output: '', error: null, stats };
  const error = mongoFieldError(field);
  if (error) return { output: '', error, stats };
  return { output: mongoInFilters(field, values, { not, batchSize, style }), error: null, stats };
}
