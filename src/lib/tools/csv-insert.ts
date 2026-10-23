import { cellKind, readCsvTable, type CsvDelimiter, type CsvParseError } from './csv';
import {
  chunk,
  indent,
  isValidIdentifier,
  keyword,
  quoteValue,
  type QuoteStyle,
} from './sql/format';

export type InsertMode = 'multi' | 'single';
export type IdentifierQuote = 'auto' | 'double' | 'backtick' | 'none';

export const insertModes: readonly InsertMode[] = ['multi', 'single'];
export const identifierQuotes: readonly IdentifierQuote[] = ['auto', 'double', 'backtick', 'none'];

export interface CsvInsertOptions {
  table: string;
  delimiter: CsvDelimiter;
  header: boolean;
  mode: InsertMode;
  batchSize: number;
  quote: QuoteStyle;
  escape: boolean;
  identifiers: IdentifierQuote;
  nullEmpty: boolean;
  infer: boolean;
  uppercase: boolean;
}

export type CsvInsertError =
  | { code: 'tableRequired' }
  | { code: 'invalidTable'; table: string }
  | { code: 'csv'; error: CsvParseError }
  | { code: 'raggedRows'; rows: number[] };

export interface CsvInsertResult {
  output: string;
  error: CsvInsertError | null;
  rows: number;
}

const defaultOptions: CsvInsertOptions = {
  table: '',
  delimiter: 'auto',
  header: true,
  mode: 'multi',
  batchSize: 0,
  quote: 'single',
  escape: true,
  identifiers: 'auto',
  nullEmpty: true,
  infer: true,
  uppercase: true,
};

const SIMPLE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function quoteIdentifier(name: string, style: IdentifierQuote = 'auto'): string {
  if (style === 'none') return name;
  if (style === 'auto' && SIMPLE_IDENTIFIER.test(name)) return name;
  const char = style === 'backtick' ? '`' : '"';
  return `${char}${name.split(char).join(char + char)}${char}`;
}

export function sqlCell(
  raw: string | undefined,
  { quote, escape, nullEmpty, infer, uppercase }: CsvInsertOptions,
): string {
  const value = raw ?? '';
  if (value === '' && nullEmpty) return keyword('NULL', uppercase);
  if (infer) {
    const kind = cellKind(value);
    if (kind === 'number') return value;
    if (kind === 'boolean') return keyword(value, uppercase);
    if (kind === 'null') return keyword('NULL', uppercase);
  }
  return quoteValue(value, { quote, escape });
}

function insertHead(table: string, columns: string[] | null, options: CsvInsertOptions): string {
  const into = keyword('INSERT INTO', options.uppercase);
  const values = keyword('VALUES', options.uppercase);
  const list = columns ? ` (${columns.join(', ')})` : '';
  return `${into} ${table}${list} ${values}`;
}

export function buildCsvInsert(
  input: string,
  partial: Partial<CsvInsertOptions> = {},
): CsvInsertResult {
  const options = { ...defaultOptions, ...partial };
  if (!input.trim()) return { output: '', error: null, rows: 0 };
  const table = options.table.trim();
  if (!table) return { output: '', error: { code: 'tableRequired' }, rows: 0 };
  if (!isValidIdentifier(table)) {
    return { output: '', error: { code: 'invalidTable', table }, rows: 0 };
  }
  const parsed = readCsvTable(input, { delimiter: options.delimiter, header: options.header });
  if (!parsed.ok) return { output: '', error: { code: 'csv', error: parsed.error }, rows: 0 };
  const { header, rows } = parsed.table;
  const width = header?.length ?? rows.reduce((max, row) => Math.max(max, row.length), 0);
  const offset = header ? 2 : 1;
  const ragged = rows.flatMap((row, index) => (row.length === width ? [] : [index + offset]));
  const columns = header ? header.map((name) => quoteIdentifier(name, options.identifiers)) : null;
  const tuples = rows.map(
    (row) =>
      `(${Array.from({ length: width }, (_, index) => sqlCell(row[index], options)).join(', ')})`,
  );
  const head = insertHead(table, columns, options);
  const output =
    options.mode === 'single'
      ? tuples.map((tuple) => `${head} ${tuple};`).join('\n')
      : chunk(tuples, options.batchSize)
          .map((batch) => `${head}\n${indent(batch.join(',\n'))};`)
          .join('\n\n');
  return {
    output,
    error: ragged.length > 0 ? { code: 'raggedRows', rows: ragged } : null,
    rows: rows.length,
  };
}
