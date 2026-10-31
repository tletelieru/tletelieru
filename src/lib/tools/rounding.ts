import {
  formatDecimal,
  parseDecimal,
  round,
  roundingModes,
  type RoundingMode,
} from './_shared/decimal';

export interface RoundingRow {
  value: string;
  results: Record<RoundingMode, string>;
}

export interface RoundingResult {
  rows: RoundingRow[];
  invalid: { line: number; text: string }[];
}

export function compareRounding(input: string, decimals: number): RoundingResult {
  const rows: RoundingRow[] = [];
  const invalid: RoundingResult['invalid'] = [];
  input.split(/\r?\n/).forEach((raw, index) => {
    const text = raw.trim();
    if (text === '') return;
    const value = parseDecimal(text);
    if (!value) {
      invalid.push({ line: index + 1, text });
      return;
    }
    const results = Object.fromEntries(
      roundingModes.map((mode) => [mode, formatDecimal(round(value, decimals, mode))]),
    ) as Record<RoundingMode, string>;
    rows.push({ value: text, results });
  });
  return { rows, invalid };
}
