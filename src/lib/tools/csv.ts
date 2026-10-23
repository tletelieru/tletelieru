import { parseJsonValue, type JsonError } from './json';

export type CsvDelimiter = 'auto' | 'comma' | 'semicolon' | 'tab';
export type CsvJsonMode = 'csv2json' | 'json2csv';
export type CellKind = 'string' | 'number' | 'boolean' | 'null';
export type CsvValue = string | number | boolean | null;

export const csvDelimiters: readonly CsvDelimiter[] = ['auto', 'comma', 'semicolon', 'tab'];
export const csvJsonModes: readonly CsvJsonMode[] = ['csv2json', 'json2csv'];

const DELIMITER_CHARS: Record<Exclude<CsvDelimiter, 'auto'>, string> = {
  comma: ',',
  semicolon: ';',
  tab: '\t',
};

const CANDIDATES = [',', ';', '\t'];
const NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
const BOM = '﻿';

export type CsvParseError =
  | { code: 'unterminatedQuote'; line: number }
  | { code: 'textAfterQuote'; line: number; column: number };

export type CsvParseResult = { ok: true; rows: string[][] } | { ok: false; error: CsvParseError };

export interface CsvTable {
  header: string[] | null;
  rows: string[][];
  delimiter: string;
}

export type CsvTableResult = { ok: true; table: CsvTable } | { ok: false; error: CsvParseError };

function countOutsideQuotes(line: string, char: string): number {
  let count = 0;
  let quoted = false;
  for (const current of line) {
    if (current === '"') quoted = !quoted;
    else if (!quoted && current === char) count++;
  }
  return count;
}

function firstRecord(input: string): string {
  let quoted = false;
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (char === '"') quoted = !quoted;
    else if (!quoted && (char === '\n' || char === '\r')) return input.slice(0, index);
  }
  return input;
}

export function detectDelimiter(input: string): string {
  const line = firstRecord(input.startsWith(BOM) ? input.slice(1) : input);
  let best = ',';
  let bestCount = 0;
  for (const candidate of CANDIDATES) {
    const count = countOutsideQuotes(line, candidate);
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

export function resolveDelimiter(delimiter: CsvDelimiter, input: string): string {
  return delimiter === 'auto' ? detectDelimiter(input) : DELIMITER_CHARS[delimiter];
}

function isBlankRow(row: readonly string[]): boolean {
  return row.length === 1 && row[0] === '';
}

export function parseCsv(input: string, delimiter = ','): CsvParseResult {
  const text = input.startsWith(BOM) ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let line = 1;
  let column = 1;
  let index = 0;

  const endRow = () => {
    row.push(field);
    if (!isBlankRow(row)) rows.push(row);
    row = [];
    field = '';
  };

  while (index < text.length) {
    const char = text[index] ?? '';
    if (char === '"' && field === '') {
      const quoteLine = line;
      index++;
      column++;
      let closed = false;
      while (index < text.length) {
        const inner = text[index] ?? '';
        if (inner === '"') {
          if (text[index + 1] === '"') {
            field += '"';
            index += 2;
            column += 2;
            continue;
          }
          index++;
          column++;
          closed = true;
          break;
        }
        if (inner === '\n' || (inner === '\r' && text[index + 1] !== '\n')) {
          line++;
          column = 1;
        } else if (inner !== '\r') {
          column++;
        }
        field += inner;
        index++;
      }
      if (!closed) return { ok: false, error: { code: 'unterminatedQuote', line: quoteLine } };
      const after = text[index];
      if (after !== undefined && after !== delimiter && after !== '\n' && after !== '\r') {
        return { ok: false, error: { code: 'textAfterQuote', line, column } };
      }
      if (after === undefined) break;
      continue;
    }
    if (char === delimiter) {
      row.push(field);
      field = '';
      index++;
      column++;
      continue;
    }
    if (char === '\r' || char === '\n') {
      endRow();
      index += char === '\r' && text[index + 1] === '\n' ? 2 : 1;
      line++;
      column = 1;
      continue;
    }
    field += char;
    index++;
    column++;
  }
  if (field !== '' || row.length > 0) endRow();
  return { ok: true, rows };
}

export function uniqueHeader(cells: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return cells.map((cell, index) => {
    const base = cell.trim() || `column_${index + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count ? `${base}_${count + 1}` : base;
  });
}

export function readCsvTable(
  input: string,
  { delimiter = 'auto', header = true }: { delimiter?: CsvDelimiter; header?: boolean } = {},
): CsvTableResult {
  const char = resolveDelimiter(delimiter, input);
  const parsed = parseCsv(input, char);
  if (!parsed.ok) return parsed;
  const [first, ...rest] = parsed.rows;
  if (!header || !first)
    return { ok: true, table: { header: null, rows: parsed.rows, delimiter: char } };
  return { ok: true, table: { header: uniqueHeader(first), rows: rest, delimiter: char } };
}

export function cellKind(raw: string): CellKind {
  if (NUMBER.test(raw)) {
    const value = Number(raw);
    const integer = !/[.eE]/.test(raw);
    if (Number.isFinite(value) && (!integer || Number.isSafeInteger(value))) return 'number';
    return 'string';
  }
  const lower = raw.toLowerCase();
  if (lower === 'true' || lower === 'false') return 'boolean';
  if (lower === 'null') return 'null';
  return 'string';
}

export function inferCell(raw: string): CsvValue {
  const kind = cellKind(raw);
  if (kind === 'number') return Number(raw);
  if (kind === 'boolean') return raw.toLowerCase() === 'true';
  if (kind === 'null') return null;
  return raw;
}

export interface CsvToJsonOptions {
  delimiter: CsvDelimiter;
  header: boolean;
  infer: boolean;
  pretty: boolean;
}

export type CsvJsonError =
  | { code: 'csv'; error: CsvParseError }
  | { code: 'json'; error: JsonError }
  | { code: 'notTabular' };

export interface CsvJsonStats {
  rows: number;
  columns: number;
}

export type CsvJsonResult =
  { ok: true; output: string; stats: CsvJsonStats } | { ok: false; error: CsvJsonError };

const defaultCsvOptions: CsvToJsonOptions = {
  delimiter: 'auto',
  header: true,
  infer: true,
  pretty: true,
};

const emptyResult: CsvJsonResult = { ok: true, output: '', stats: { rows: 0, columns: 0 } };

export function csvToJson(input: string, options: Partial<CsvToJsonOptions> = {}): CsvJsonResult {
  const { delimiter, header, infer, pretty } = { ...defaultCsvOptions, ...options };
  if (!input.trim()) return emptyResult;
  const parsed = readCsvTable(input, { delimiter, header });
  if (!parsed.ok) return { ok: false, error: { code: 'csv', error: parsed.error } };
  const { table } = parsed;
  const convert = (raw: string | undefined): CsvValue => {
    if (raw === undefined) return infer ? null : '';
    return infer ? inferCell(raw) : raw;
  };
  const width = maxLength(table.rows, table.header?.length ?? 0);
  const keys = table.header ? padHeader(table.header, width) : null;
  const data = table.rows.map((row) =>
    keys
      ? Object.fromEntries(keys.map((key, index) => [key, convert(row[index])]))
      : row.map((cell) => convert(cell)),
  );
  return {
    ok: true,
    output: JSON.stringify(data, null, pretty ? 2 : undefined),
    stats: { rows: data.length, columns: width },
  };
}

function maxLength(rows: readonly (readonly unknown[])[], initial = 0): number {
  return rows.reduce((max, row) => Math.max(max, row.length), initial);
}

function padHeader(header: readonly string[], width: number): string[] {
  const extra = Array.from(
    { length: Math.max(0, width - header.length) },
    (_, offset) => `column_${header.length + offset + 1}`,
  );
  return [...header, ...extra];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function csvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function quoteCsvField(text: string, delimiter: string): string {
  const needsQuotes =
    text.includes(delimiter) ||
    text.includes('"') ||
    text.includes('\n') ||
    text.includes('\r') ||
    text !== text.trim();
  return needsQuotes ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsvRows(value: unknown, header = true): string[][] | null {
  const items = Array.isArray(value) ? value : [value];
  if (items.every(Array.isArray)) {
    return items.map((row: unknown[]) => row.map(csvField));
  }
  if (!items.every(isRecord)) return null;
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    for (const key of Object.keys(item)) {
      if (seen.has(key)) continue;
      seen.add(key);
      keys.push(key);
    }
  }
  const rows = items.map((item) => keys.map((key) => csvField(item[key])));
  return header ? [keys, ...rows] : rows;
}

export function jsonToCsv(input: string, options: Partial<CsvToJsonOptions> = {}): CsvJsonResult {
  const { delimiter, header } = { ...defaultCsvOptions, ...options };
  if (!input.trim()) return emptyResult;
  const parsed = parseJsonValue(input);
  if (!parsed.ok) return { ok: false, error: { code: 'json', error: parsed.error } };
  const rows = toCsvRows(parsed.value, header);
  if (!rows) return { ok: false, error: { code: 'notTabular' } };
  const char = delimiter === 'auto' ? ',' : DELIMITER_CHARS[delimiter];
  const output = rows
    .map((row) => row.map((cell) => quoteCsvField(cell, char)).join(char))
    .join('\n');
  const dataRows = Array.isArray(parsed.value) ? parsed.value.length : 1;
  return {
    ok: true,
    output,
    stats: { rows: dataRows, columns: maxLength(rows) },
  };
}

export function convertCsvJson(
  input: string,
  mode: CsvJsonMode,
  options: Partial<CsvToJsonOptions> = {},
): CsvJsonResult {
  return mode === 'csv2json' ? csvToJson(input, options) : jsonToCsv(input, options);
}
