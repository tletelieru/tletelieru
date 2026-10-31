import {
  add,
  compare,
  divide,
  formatDecimal,
  fromPercent,
  multiply,
  parseDecimal,
  round,
  subtract,
  sum,
  ZERO,
  type Decimal,
} from './_shared/decimal';
import {
  parseAmount,
  resolveNumberFormat,
  type NumberFormatChoice,
} from './_shared/localized-number';

export const ivaModes = ['netToGross', 'grossToNet'] as const;
export type IvaMode = (typeof ivaModes)[number];

export interface IvaOptions {
  mode: IvaMode;
  rate: string;
  decimals: number;
  format: NumberFormatChoice;
}

export interface IvaRow {
  net: string;
  iva: string;
  gross: string;
}

export interface IvaResult {
  rows: IvaRow[];
  total: IvaRow | null;
  invalid: { line: number; text: string }[];
  ambiguous: boolean;
}

const ONE: Decimal = { units: 1n, scale: 0 };

export function parseRate(text: string): Decimal | null {
  const rate = parseDecimal(text.replace(',', '.'));
  return rate && compare(rate, ZERO) >= 0 ? fromPercent(rate) : null;
}

function split(
  value: Decimal,
  rate: Decimal,
  mode: IvaMode,
  decimals: number,
): { net: Decimal; iva: Decimal; gross: Decimal } {
  const base = round(value, decimals);
  if (mode === 'netToGross') {
    const iva = round(multiply(base, rate), decimals);
    return { net: base, iva, gross: add(base, iva) };
  }
  const net = divide(base, add(ONE, rate), decimals);
  return { net, iva: subtract(base, net), gross: base };
}

function toRow(parts: { net: Decimal; iva: Decimal; gross: Decimal }): IvaRow {
  return {
    net: formatDecimal(parts.net),
    iva: formatDecimal(parts.iva),
    gross: formatDecimal(parts.gross),
  };
}

export function computeIva(input: string, options: IvaOptions): IvaResult | null {
  const rate = parseRate(options.rate);
  if (!rate) return null;
  const entries = input.split(/\r?\n/).flatMap((raw, index) => {
    const text = raw.trim();
    return text === '' ? [] : [{ text, line: index + 1 }];
  });
  const texts = entries.map((entry) => entry.text);
  const { format, ambiguous } = resolveNumberFormat(texts, options.format, 'comma');
  const values: Decimal[] = [];
  const invalid: IvaResult['invalid'] = [];
  for (const entry of entries) {
    const value = parseAmount(entry.text, format);
    if (value) values.push(value);
    else invalid.push(entry);
  }
  const { mode, decimals } = options;
  const rows = values.map((value) => toRow(split(value, rate, mode, decimals)));
  const total =
    values.length > 0
      ? toRow(split(sum(values.map((value) => round(value, decimals))), rate, mode, decimals))
      : null;
  return { rows, total, invalid, ambiguous };
}
