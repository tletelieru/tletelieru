import {
  batchedInClause,
  columnError,
  defaultSqlOptions,
  type ResolvedSqlOptions,
  type SqlToolResult,
} from './sql/format';
import { mongoFieldError, mongoInFilters, RawJson, type MongoStyle } from './mongo/filter';
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

export function jsonNumber(value: string): string {
  const negative = value.startsWith('-');
  const body = negative ? value.slice(1) : value;
  return `${negative ? '-' : ''}${body.startsWith('.') ? `0${body}` : body}`;
}

export interface MongoInNumbersOptions {
  field: string;
  not: boolean;
  sort: boolean;
  parse: ResolvedSqlOptions['parse'];
  batchSize: number;
  style: MongoStyle;
}

export function buildMongoInNumbers(
  input: string,
  options: Partial<MongoInNumbersOptions> = {},
): SqlToolResult {
  const { field, not, sort, parse, batchSize, style } = {
    field: '',
    not: false,
    sort: false,
    parse: defaultSqlOptions.parse,
    batchSize: 0,
    style: 'pretty' as MongoStyle,
    ...options,
  };
  const { values: raw } = parseValues(input, { ...parse, dedupe: false });
  const valid = raw.filter(isSqlNumber);
  const invalid = raw.filter((value) => !isSqlNumber(value));
  const { values, stats } = dedupeValues(valid, parse.dedupe !== false, (value) =>
    String(Number(value)),
  );
  if (!raw.length) return { output: '', error: null, stats };
  const fieldError = mongoFieldError(field);
  if (fieldError) return { output: '', error: fieldError, stats };
  const ordered = sort ? [...values].sort((a, b) => Number(a) - Number(b)) : values;
  const numbers = ordered.map((value) => new RawJson(jsonNumber(value)));
  return {
    output: mongoInFilters(field, numbers, { not, batchSize, style }),
    error: invalid.length ? { code: 'invalidNumbers', values: invalid } : null,
    stats,
  };
}
