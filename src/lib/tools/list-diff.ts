import { compare, formatDecimal, subtract, add, type Decimal, ZERO } from './_shared/decimal';
import {
  parseAmount,
  resolveNumberFormat,
  type NumberFormatChoice,
} from './_shared/localized-number';

export type ListSide = 'a' | 'b';

export interface ListDiffOptions {
  amounts: boolean;
  format: NumberFormatChoice;
  ignoreCase: boolean;
}

export interface ListEntry {
  id: string;
  amount: string | null;
}

export interface AmountMismatch {
  id: string;
  a: string;
  b: string;
  delta: string;
}

export interface InvalidRow {
  side: ListSide;
  line: number;
  text: string;
}

export interface ListDiffResult {
  onlyA: ListEntry[];
  onlyB: ListEntry[];
  both: ListEntry[];
  mismatches: AmountMismatch[];
  duplicates: { a: string[]; b: string[] };
  invalid: InvalidRow[];
  totals: { a: string; b: string } | null;
  ambiguous: boolean;
}

interface RawRow {
  line: number;
  text: string;
  id: string;
  amount: string;
}

interface Tally {
  id: string;
  amount: Decimal | null;
  count: number;
}

function splitRow(text: string, amounts: boolean): { id: string; amount: string } {
  if (!amounts) return { id: text, amount: '' };
  const match = /^(.*?)(?:[\t;,]|\s+)\s*(.*)$/.exec(text);
  return match
    ? { id: (match[1] ?? '').trim(), amount: (match[2] ?? '').trim() }
    : { id: text, amount: '' };
}

function readRows(input: string, amounts: boolean): RawRow[] {
  return input.split(/\r?\n/).flatMap((raw, index) => {
    const text = raw.trim();
    return text === '' ? [] : [{ line: index + 1, text, ...splitRow(text, amounts) }];
  });
}

function tally(
  rows: readonly RawRow[],
  side: ListSide,
  options: ListDiffOptions,
  format: 'comma' | 'dot',
  invalid: InvalidRow[],
): Map<string, Tally> {
  const entries = new Map<string, Tally>();
  rows.forEach((row, position) => {
    const amount = options.amounts ? parseAmount(row.amount, format) : null;
    if (options.amounts && !amount) {
      if (position > 0) invalid.push({ side, line: row.line, text: row.text });
      return;
    }
    const key = options.ignoreCase ? row.id.toLowerCase() : row.id;
    const current = entries.get(key);
    if (current) {
      current.count++;
      current.amount = current.amount && amount ? add(current.amount, amount) : null;
    } else {
      entries.set(key, { id: row.id, amount, count: 1 });
    }
  });
  return entries;
}

function toEntry({ id, amount }: Tally): ListEntry {
  return { id, amount: amount && formatDecimal(amount) };
}

function total(entries: Map<string, Tally>): string {
  let value: Decimal = ZERO;
  for (const entry of entries.values()) if (entry.amount) value = add(value, entry.amount);
  return formatDecimal(value);
}

function repeated(entries: Map<string, Tally>): string[] {
  return [...entries.values()].filter((entry) => entry.count > 1).map((entry) => entry.id);
}

export function diffLists(
  inputA: string,
  inputB: string,
  options: ListDiffOptions,
): ListDiffResult {
  const rowsA = readRows(inputA, options.amounts);
  const rowsB = readRows(inputB, options.amounts);
  const amounts = options.amounts ? [...rowsA, ...rowsB].map((row) => row.amount) : [];
  const { format, ambiguous } = resolveNumberFormat(amounts, options.format, 'comma');
  const invalid: InvalidRow[] = [];
  const a = tally(rowsA, 'a', options, format, invalid);
  const b = tally(rowsB, 'b', options, format, invalid);

  const onlyA: ListEntry[] = [];
  const both: ListEntry[] = [];
  const mismatches: AmountMismatch[] = [];
  for (const [key, left] of a) {
    const right = b.get(key);
    if (!right) {
      onlyA.push(toEntry(left));
    } else if (left.amount && right.amount && compare(left.amount, right.amount) !== 0) {
      mismatches.push({
        id: left.id,
        a: formatDecimal(left.amount),
        b: formatDecimal(right.amount),
        delta: formatDecimal(subtract(right.amount, left.amount)),
      });
    } else {
      both.push(toEntry(left));
    }
  }
  const onlyB = [...b].filter(([key]) => !a.has(key)).map(([, entry]) => toEntry(entry));

  return {
    onlyA,
    onlyB,
    both,
    mismatches,
    duplicates: { a: repeated(a), b: repeated(b) },
    invalid,
    totals: options.amounts ? { a: total(a), b: total(b) } : null,
    ambiguous,
  };
}
