import { compare, formatDecimal, negate, ZERO, type Decimal } from './_shared/decimal';
import {
  parseAmount,
  resolveNumberFormat,
  type DecimalMark,
  type NumberFormatChoice,
} from './_shared/localized-number';
import { quoteCsvField, readCsvTable, type CsvDelimiter, type CsvParseError } from './csv';

export const statementFields = [
  'date',
  'description',
  'debit',
  'credit',
  'balance',
  'amount',
] as const;
export type StatementField = (typeof statementFields)[number];

export const dateOrders = ['auto', 'dmy', 'mdy', 'ymd'] as const;
export type DateOrder = (typeof dateOrders)[number];

export const statementOutputs = ['csv', 'json'] as const;
export type StatementOutput = (typeof statementOutputs)[number];

export const AUTO_COLUMN = 'auto';
export const NO_COLUMN = 'none';

export type ColumnMapping = Record<StatementField, string>;

export interface StatementOptions {
  delimiter: CsvDelimiter;
  header: boolean;
  mapping: ColumnMapping;
  numberFormat: NumberFormatChoice;
  dateOrder: DateOrder;
  output: StatementOutput;
}

export interface StatementRow {
  date: string;
  description: string;
  debit: string;
  credit: string;
  balance: string;
}

export interface StatementSuccess {
  ok: true;
  output: string;
  columns: string[];
  mapping: Record<StatementField, number | null>;
  rows: StatementRow[];
  invalid: { row: number; field: StatementField; text: string }[];
  numberFormat: DecimalMark;
  dateOrder: Exclude<DateOrder, 'auto'>;
  ambiguous: boolean;
}

export type StatementError =
  { code: 'csv'; error: CsvParseError } | { code: 'noDate' } | { code: 'noAmount' };

export type StatementResult = StatementSuccess | { ok: false; error: StatementError };

const FIELD_PATTERNS: [StatementField, RegExp][] = [
  ['date', /fecha|date|^f\.? ?mov/],
  ['balance', /saldo|balance/],
  ['debit', /cargo|debito|debit|giro|withdraw|retiro/],
  ['credit', /abono|credito|credit|deposito|deposit/],
  ['amount', /monto|amount|importe|valor|value/],
  ['description', /descrip|glosa|detalle|concepto|memo|narrativ|details|referencia/],
];

const DATE = /^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})/;

function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

export function detectColumns(columns: readonly string[]): Record<StatementField, number | null> {
  const found: Record<StatementField, number | null> = {
    date: null,
    description: null,
    debit: null,
    credit: null,
    balance: null,
    amount: null,
  };
  const taken = new Set<number>();
  for (const [field, pattern] of FIELD_PATTERNS) {
    const index = columns.findIndex((name, at) => !taken.has(at) && pattern.test(fold(name)));
    if (index >= 0) {
      found[field] = index;
      taken.add(index);
    }
  }
  return found;
}

function resolveMapping(
  mapping: ColumnMapping,
  columns: readonly string[],
): Record<StatementField, number | null> {
  const detected = detectColumns(columns);
  const resolved = { ...detected };
  for (const field of statementFields) {
    const choice = mapping[field];
    if (choice === NO_COLUMN) resolved[field] = null;
    else if (choice !== AUTO_COLUMN && columns[Number(choice)] !== undefined) {
      resolved[field] = Number(choice);
    }
  }
  return resolved;
}

function detectDateOrder(cells: readonly string[]): Exclude<DateOrder, 'auto'> {
  let dmy = 0;
  let mdy = 0;
  for (const cell of cells) {
    const match = DATE.exec(cell.trim());
    if (!match) continue;
    if ((match[1] ?? '').length === 4) return 'ymd';
    if (Number(match[1]) > 12) dmy++;
    if (Number(match[2]) > 12) mdy++;
  }
  return mdy > dmy ? 'mdy' : 'dmy';
}

function isRealDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function normalizeDate(text: string, order: Exclude<DateOrder, 'auto'>): string | null {
  const match = DATE.exec(text.trim());
  if (!match) return null;
  const parts = [match[1] ?? '', match[2] ?? '', match[3] ?? ''];
  const [yearText, month, day] =
    order === 'ymd'
      ? [parts[0], parts[1], parts[2]]
      : order === 'dmy'
        ? [parts[2], parts[1], parts[0]]
        : [parts[2], parts[0], parts[1]];
  const fullYear = yearText?.length === 2 ? `20${yearText}` : (yearText ?? '');
  if (fullYear.length !== 4) return null;
  if (!isRealDate(Number(fullYear), Number(month), Number(day))) return null;
  return `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function absolute(value: Decimal): Decimal {
  return compare(value, ZERO) < 0 ? negate(value) : value;
}

function toCsv(rows: readonly StatementRow[]): string {
  const header = ['date', 'description', 'debit', 'credit', 'balance'];
  const body = rows.map((row) =>
    [row.date, row.description, row.debit, row.credit, row.balance]
      .map((cell) => quoteCsvField(cell, ','))
      .join(','),
  );
  return [header.join(','), ...body].join('\n');
}

export function statementColumns(
  input: string,
  options: Pick<StatementOptions, 'delimiter' | 'header'>,
): string[] {
  const read = readCsvTable(input, options);
  if (!read.ok) return [];
  const { header, rows } = read.table;
  const width = Math.max(header?.length ?? 0, ...rows.map((row) => row.length));
  return header ?? Array.from({ length: width }, (_, index) => String(index + 1));
}

export function normalizeStatement(input: string, options: StatementOptions): StatementResult {
  const read = readCsvTable(input, { delimiter: options.delimiter, header: options.header });
  if (!read.ok) return { ok: false, error: { code: 'csv', error: read.error } };
  const { table } = read;
  const columns = statementColumns(input, options);
  const mapping = resolveMapping(options.mapping, columns);
  if (mapping.date === null) return { ok: false, error: { code: 'noDate' } };
  if (mapping.debit === null && mapping.credit === null && mapping.amount === null) {
    return { ok: false, error: { code: 'noAmount' } };
  }

  const cell = (row: readonly string[], field: StatementField): string => {
    const index = mapping[field];
    return index === null ? '' : (row[index] ?? '').trim();
  };
  const numeric = table.rows.flatMap((row) =>
    (['debit', 'credit', 'balance', 'amount'] as const)
      .map((field) => cell(row, field))
      .filter(Boolean),
  );
  const { format, ambiguous } = resolveNumberFormat(numeric, options.numberFormat, 'comma');
  const dateOrder =
    options.dateOrder === 'auto'
      ? detectDateOrder(table.rows.map((row) => cell(row, 'date')))
      : options.dateOrder;

  const invalid: StatementSuccess['invalid'] = [];
  const firstRow = options.header ? 2 : 1;
  const rows = table.rows.map((row, index): StatementRow => {
    const number = (field: StatementField): Decimal | null => {
      const text = cell(row, field);
      if (text === '') return null;
      const value = parseAmount(text, format);
      if (!value) invalid.push({ row: index + firstRow, field, text });
      return value;
    };
    const rawDate = cell(row, 'date');
    const date = normalizeDate(rawDate, dateOrder);
    if (date === null) invalid.push({ row: index + firstRow, field: 'date', text: rawDate });
    let debit = number('debit');
    let credit = number('credit');
    const amount = number('amount');
    if (amount && !debit && !credit) {
      if (compare(amount, ZERO) < 0) debit = amount;
      else credit = amount;
    }
    debit = debit && absolute(debit);
    credit = credit && absolute(credit);
    const balance = number('balance');
    return {
      date: date ?? rawDate,
      description: cell(row, 'description'),
      debit: debit ? formatDecimal(debit) : '',
      credit: credit ? formatDecimal(credit) : '',
      balance: balance ? formatDecimal(balance) : '',
    };
  });

  return {
    ok: true,
    output: options.output === 'csv' ? toCsv(rows) : JSON.stringify(rows, null, 2),
    columns,
    mapping,
    rows,
    invalid,
    numberFormat: format,
    dateOrder,
    ambiguous,
  };
}
