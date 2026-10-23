import { formatDialect, mysql, postgresql, sql, type DialectOptions } from 'sql-formatter';

export type SqlFormatDialect = 'sql' | 'postgresql' | 'mysql';
export type SqlKeywordCase = 'upper' | 'lower' | 'preserve';
export type SqlIndent = '2' | '4' | 'tab';

export const sqlFormatDialects: readonly SqlFormatDialect[] = ['sql', 'postgresql', 'mysql'];
export const sqlKeywordCases: readonly SqlKeywordCase[] = ['upper', 'lower', 'preserve'];
export const sqlIndents: readonly SqlIndent[] = ['2', '4', 'tab'];

const DIALECTS: Record<SqlFormatDialect, DialectOptions> = { sql, postgresql, mysql };

export interface SqlFormatOptions {
  dialect: SqlFormatDialect;
  keywordCase: SqlKeywordCase;
  indent: SqlIndent;
  minify: boolean;
}

export interface SqlFormatError {
  code: 'parse';
  line: number | null;
  column: number | null;
}

export type SqlFormatResult = { ok: true; output: string } | { ok: false; error: SqlFormatError };

const defaultOptions: SqlFormatOptions = {
  dialect: 'sql',
  keywordCase: 'upper',
  indent: '2',
  minify: false,
};

const POSITION = /line (\d+) column (\d+)/i;
const DOLLAR_TAG = /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/;
const NO_SPACE_AFTER = /[(.]$/;
const NO_SPACE_BEFORE = /^[),;.]/;

function readQuoted(text: string, start: number): number {
  const quote = text[start];
  let index = start + 1;
  while (index < text.length) {
    const char = text[index];
    if (char === '\\' && quote === "'") {
      index += 2;
      continue;
    }
    if (char === quote) {
      if (text[index + 1] === quote) {
        index += 2;
        continue;
      }
      return index + 1;
    }
    index++;
  }
  return text.length;
}

function readDollar(text: string, start: number): number {
  const match = DOLLAR_TAG.exec(text.slice(start));
  if (!match) return start + 1;
  const tag = match[0];
  const end = text.indexOf(tag, start + tag.length);
  return end < 0 ? text.length : end + tag.length;
}

export function minifySql(input: string): string {
  let out = '';
  let space = false;
  let index = 0;
  const push = (token: string) => {
    if (space && out && !NO_SPACE_AFTER.test(out) && !NO_SPACE_BEFORE.test(token)) out += ' ';
    space = false;
    out += token;
  };
  while (index < input.length) {
    const char = input[index] ?? '';
    const next = input[index + 1];
    if (/\s/.test(char)) {
      space = true;
      index++;
    } else if (char === '-' && next === '-') {
      const end = input.indexOf('\n', index);
      index = end < 0 ? input.length : end;
      space = true;
    } else if (char === '/' && next === '*') {
      const end = input.indexOf('*/', index + 2);
      index = end < 0 ? input.length : end + 2;
      space = true;
    } else if (char === "'" || char === '"' || char === '`') {
      const end = readQuoted(input, index);
      push(input.slice(index, end));
      index = end;
    } else if (char === '$' && DOLLAR_TAG.test(input.slice(index))) {
      const end = readDollar(input, index);
      push(input.slice(index, end));
      index = end;
    } else {
      push(char);
      index++;
    }
  }
  return out;
}

export function parseFormatError(error: unknown): SqlFormatError {
  const message = error instanceof Error ? error.message : String(error);
  const match = POSITION.exec(message);
  return {
    code: 'parse',
    line: match ? Number(match[1]) : null,
    column: match ? Number(match[2]) : null,
  };
}

export function formatSql(input: string, options: Partial<SqlFormatOptions> = {}): SqlFormatResult {
  const { dialect, keywordCase, indent, minify } = { ...defaultOptions, ...options };
  if (!input.trim()) return { ok: true, output: '' };
  try {
    const formatted = formatDialect(input, {
      dialect: DIALECTS[dialect],
      keywordCase,
      dataTypeCase: keywordCase,
      functionCase: keywordCase,
      tabWidth: indent === 'tab' ? 2 : Number(indent),
      useTabs: indent === 'tab',
    });
    return { ok: true, output: minify ? minifySql(formatted) : formatted };
  } catch (error) {
    return { ok: false, error: parseFormatError(error) };
  }
}
