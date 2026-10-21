import {
  chunk,
  columnError,
  combineClauses,
  defaultSqlOptions,
  keyword,
  sqlString,
  type ResolvedSqlOptions,
  type SqlToolResult,
} from './sql/format';
import { parseValues } from './sql/values';

export type LikeMatch = 'contains' | 'starts' | 'ends' | 'exact';
export type LikeJoiner = 'or' | 'and';

export const likeMatches: readonly LikeMatch[] = ['contains', 'starts', 'ends', 'exact'];
export const likeJoiners: readonly LikeJoiner[] = ['or', 'and'];

export const LIKE_ESCAPE = '!';

export interface SqlLikeOptions extends ResolvedSqlOptions {
  column: string;
  match: LikeMatch;
  joiner: LikeJoiner;
  not: boolean;
  ilike: boolean;
  escapeWildcards: boolean;
  wrap: boolean;
}

export function escapeLikeWildcards(value: string): string {
  return value.replace(/[!%_]/g, `${LIKE_ESCAPE}$&`);
}

export function likePattern(value: string, match: LikeMatch, escapeWildcards = false): string {
  const body = escapeWildcards ? escapeLikeWildcards(value) : value;
  if (match === 'contains') return `%${body}%`;
  if (match === 'starts') return `${body}%`;
  if (match === 'ends') return `%${body}`;
  return body;
}

export function buildSqlLike(input: string, options: Partial<SqlLikeOptions> = {}): SqlToolResult {
  const {
    column,
    match,
    joiner,
    not,
    ilike,
    escapeWildcards,
    wrap,
    parse,
    escape,
    layout,
    batchSize,
    uppercase,
  } = {
    ...defaultSqlOptions,
    column: '',
    match: 'contains' as LikeMatch,
    joiner: 'or' as LikeJoiner,
    not: false,
    ilike: false,
    escapeWildcards: false,
    wrap: true,
    ...options,
  };
  const { values, stats } = parseValues(input, parse);
  if (!values.length) return { output: '', error: null, stats };
  const error = columnError(column, true);
  if (error) return { output: '', error, stats };
  const name = column.trim();
  const operator = keyword(`${not ? 'NOT ' : ''}${ilike ? 'ILIKE' : 'LIKE'}`, uppercase);
  const escapeClause = ` ${keyword('ESCAPE', uppercase)} '${LIKE_ESCAPE}'`;
  const conditions = values.map((value) => {
    const needsEscape = escapeWildcards && escapeLikeWildcards(value) !== value;
    const pattern = sqlString(likePattern(value, match, escapeWildcards), escape);
    return `${name} ${operator} ${pattern}${needsEscape ? escapeClause : ''}`;
  });
  const joinWord = joiner === 'and' ? 'AND' : 'OR';
  const groups = chunk(conditions, batchSize).map((group) =>
    combineClauses(group, { joiner: joinWord, layout, uppercase, wrap }),
  );
  return { output: groups.join('\n\n'), error: null, stats };
}
