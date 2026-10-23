import {
  batchedInClause,
  columnError,
  combineClauses,
  defaultSqlOptions,
  keyword,
  type ResolvedSqlOptions,
  type SqlToolResult,
} from './sql/format';
import { mongoFieldError, mongoInFilters, serializeMongo, type MongoStyle } from './mongo/filter';
import { parseValues } from './sql/values';

export type JsonDialect = 'postgres' | 'mysql';
export type JsonOperation = 'arrow' | 'path' | 'extract' | 'contains';

export const jsonDialects: readonly JsonDialect[] = ['postgres', 'mysql'];

export const jsonOperations: Record<JsonDialect, readonly JsonOperation[]> = {
  postgres: ['arrow', 'path', 'contains'],
  mysql: ['extract', 'arrow', 'contains'],
};

export interface SqlJsonOptions extends ResolvedSqlOptions {
  dialect: JsonDialect;
  column: string;
  path: string;
  operation: JsonOperation;
}

const KEY_SEGMENT = /^[\p{L}\p{N}_-]+$/u;
const MYSQL_BARE_KEY = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function resolveOperation(dialect: JsonDialect, operation: string): JsonOperation {
  const allowed = jsonOperations[dialect];
  return allowed.find((item) => item === operation) ?? allowed[0];
}

export function parseKeyPath(path: string): string[] | null {
  const trimmed = path.trim();
  if (!trimmed) return null;
  const segments = trimmed.split('.');
  return segments.every((segment) => KEY_SEGMENT.test(segment)) ? segments : null;
}

export function sqlLiteral(value: string, dialect: JsonDialect): string {
  const escaped = dialect === 'mysql' ? value.replace(/\\/g, '\\\\') : value;
  return `'${escaped.replace(/'/g, "''")}'`;
}

export function jsonDocument(segments: readonly string[], value: string): string {
  return segments.reduceRight(
    (inner, segment) => `{${JSON.stringify(segment)}: ${inner}}`,
    JSON.stringify(value),
  );
}

export function mysqlPath(segments: readonly string[]): string {
  const parts = segments.map((segment) =>
    MYSQL_BARE_KEY.test(segment) ? segment : JSON.stringify(segment),
  );
  return `$.${parts.join('.')}`;
}

export function pgArrowExpression(column: string, segments: readonly string[]): string {
  const keys = segments.map((segment) => `'${segment}'`);
  const last = keys[keys.length - 1];
  const parents = keys.slice(0, -1).map((key) => `->${key}`);
  return `${column}${parents.join('')}->>${last}`;
}

export function pgPathExpression(column: string, segments: readonly string[]): string {
  return `${column} #>> '{${segments.join(',')}}'`;
}

export function mysqlExtractExpression(
  column: string,
  segments: readonly string[],
  uppercase = true,
): string {
  const path = sqlLiteral(mysqlPath(segments), 'mysql');
  return `${keyword('JSON_UNQUOTE', uppercase)}(${keyword('JSON_EXTRACT', uppercase)}(${column}, ${path}))`;
}

export function mysqlArrowExpression(column: string, segments: readonly string[]): string {
  return `${column}->>${sqlLiteral(mysqlPath(segments), 'mysql')}`;
}

export function containsCondition(
  dialect: JsonDialect,
  column: string,
  segments: readonly string[],
  value: string,
  uppercase = true,
): string {
  if (dialect === 'postgres') {
    return `${column} @> ${sqlLiteral(jsonDocument(segments, value), 'postgres')}`;
  }
  const document = sqlLiteral(JSON.stringify(value), 'mysql');
  const path = sqlLiteral(mysqlPath(segments), 'mysql');
  return `${keyword('JSON_CONTAINS', uppercase)}(${column}, ${document}, ${path})`;
}

export function valueExpression(
  dialect: JsonDialect,
  operation: JsonOperation,
  column: string,
  segments: readonly string[],
  uppercase = true,
): string {
  if (dialect === 'postgres') {
    return operation === 'path'
      ? pgPathExpression(column, segments)
      : pgArrowExpression(column, segments);
  }
  return operation === 'arrow'
    ? mysqlArrowExpression(column, segments)
    : mysqlExtractExpression(column, segments, uppercase);
}

export function buildSqlJson(input: string, options: Partial<SqlJsonOptions> = {}): SqlToolResult {
  const { dialect, column, path, operation, parse, layout, batchSize, uppercase } = {
    ...defaultSqlOptions,
    dialect: 'postgres' as JsonDialect,
    column: 'meta_data',
    path: 'reference',
    operation: 'arrow' as JsonOperation,
    ...options,
  };
  const { values, stats } = parseValues(input, parse);
  if (!values.length) return { output: '', error: null, stats };
  const nameError = columnError(column, true);
  if (nameError) return { output: '', error: nameError, stats };
  if (!path.trim()) return { output: '', error: { code: 'pathRequired' }, stats };
  const segments = parseKeyPath(path);
  if (!segments) {
    return {
      output: '',
      error: { code: 'invalidPath', path: path.trim() },
      stats,
    };
  }
  const name = column.trim();
  const op = resolveOperation(dialect, operation);
  if (op === 'contains') {
    const conditions = values.map((value) =>
      containsCondition(dialect, name, segments, value, uppercase),
    );
    return {
      output: combineClauses(conditions, { joiner: 'OR', layout, uppercase }),
      error: null,
      stats,
    };
  }
  const expression = valueExpression(dialect, op, name, segments, uppercase);
  const literals = values.map((value) => sqlLiteral(value, dialect));
  const output =
    literals.length === 1
      ? `${expression} = ${literals[0]}`
      : batchedInClause(literals, { column: expression, layout, batchSize, uppercase });
  return { output, error: null, stats };
}

export interface MongoJsonOptions {
  column: string;
  path: string;
  parse: ResolvedSqlOptions['parse'];
  batchSize: number;
  style: MongoStyle;
}

export function buildMongoJson(
  input: string,
  options: Partial<MongoJsonOptions> = {},
): SqlToolResult {
  const { column, path, parse, batchSize, style } = {
    column: 'meta_data',
    path: 'reference',
    parse: defaultSqlOptions.parse,
    batchSize: 0,
    style: 'pretty' as MongoStyle,
    ...options,
  };
  const { values, stats } = parseValues(input, parse);
  if (!values.length) return { output: '', error: null, stats };
  const fieldError = mongoFieldError(column);
  if (fieldError) return { output: '', error: fieldError, stats };
  if (!path.trim()) return { output: '', error: { code: 'pathRequired' }, stats };
  const segments = parseKeyPath(path);
  if (!segments) return { output: '', error: { code: 'invalidPath', path: path.trim() }, stats };
  const field = [column.trim(), ...segments].join('.');
  if (values.length === 1) {
    return { output: serializeMongo({ [field]: values[0] ?? '' }, style), error: null, stats };
  }
  return {
    output: mongoInFilters(field, values, { not: false, batchSize, style }),
    error: null,
    stats,
  };
}
