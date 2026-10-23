import { chunk, type SqlToolError } from '../sql/format';

export type QueryTarget = 'sql' | 'mongo';
export type MongoStyle = 'pretty' | 'compact';

export const queryTargets: readonly QueryTarget[] = ['sql', 'mongo'];
export const mongoStyles: readonly MongoStyle[] = ['pretty', 'compact'];

export class RawJson {
  constructor(readonly text: string) {}
}

export type MongoValue =
  string | number | boolean | null | RawJson | MongoValue[] | { [key: string]: MongoValue };

export type MongoMatch = 'contains' | 'starts' | 'ends' | 'exact';

export interface MongoInOptions {
  not: boolean;
  batchSize: number;
  style: MongoStyle;
}

export interface MongoRegexOptions {
  match: MongoMatch;
  joiner: 'or' | 'and';
  not: boolean;
  caseInsensitive: boolean;
  batchSize: number;
  style: MongoStyle;
}

function isScalar(value: MongoValue): boolean {
  return value === null || typeof value !== 'object' || value instanceof RawJson;
}

function scalar(value: MongoValue): string {
  if (value instanceof RawJson) return value.text;
  return JSON.stringify(value);
}

export function serializeMongo(value: MongoValue, style: MongoStyle = 'pretty', level = 0): string {
  if (isScalar(value)) return scalar(value);
  const pad = '  '.repeat(level + 1);
  const close = '  '.repeat(level);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map((item) => serializeMongo(item, style, level + 1));
    if (style === 'compact' || value.every(isScalar)) return `[${items.join(', ')}]`;
    return `[\n${items.map((item) => pad + item).join(',\n')}\n${close}]`;
  }
  const entries = Object.entries(value as { [key: string]: MongoValue });
  if (entries.length === 0) return '{}';
  const parts = entries.map(
    ([key, item]) => `${JSON.stringify(key)}: ${serializeMongo(item, style, level + 1)}`,
  );
  if (style === 'compact') return `{ ${parts.join(', ')} }`;
  return `{\n${parts.map((part) => pad + part).join(',\n')}\n${close}}`;
}

export function mongoFieldError(field: string): SqlToolError | null {
  const name = field.trim();
  if (!name) return { code: 'fieldRequired' };
  if (name.startsWith('$') || name.includes('..') || name.startsWith('.') || name.endsWith('.')) {
    return { code: 'invalidField', field: name };
  }
  return null;
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

export function regexPattern(value: string, match: MongoMatch): string {
  const body = escapeRegex(value);
  if (match === 'starts') return `^${body}`;
  if (match === 'ends') return `${body}$`;
  if (match === 'exact') return `^${body}$`;
  return body;
}

export function mongoInFilters(
  field: string,
  values: readonly MongoValue[],
  { not, batchSize, style }: MongoInOptions,
): string {
  if (values.length === 0) return '';
  const name = field.trim();
  const operator = not ? '$nin' : '$in';
  return chunk(values, batchSize)
    .map((batch) => serializeMongo({ [name]: { [operator]: batch } }, style))
    .join('\n\n');
}

export function mongoRegexFilters(
  field: string,
  values: readonly string[],
  { match, joiner, not, caseInsensitive, batchSize, style }: MongoRegexOptions,
): string {
  if (values.length === 0) return '';
  const name = field.trim();
  const conditions = values.map((value) => {
    const regex: { [key: string]: MongoValue } = { $regex: regexPattern(value, match) };
    if (caseInsensitive) regex.$options = 'i';
    return { [name]: not ? { $not: regex } : regex };
  });
  const operator = joiner === 'and' ? '$and' : '$or';
  return chunk(conditions, batchSize)
    .map((batch) =>
      serializeMongo(batch.length === 1 ? (batch[0] ?? {}) : { [operator]: batch }, style),
    )
    .join('\n\n');
}
