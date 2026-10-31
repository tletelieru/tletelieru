import {
  add,
  compare,
  divide,
  formatDecimal,
  formatTrimmed,
  multiply,
  sqrt,
  subtract,
  sum,
  type Decimal,
} from './_shared/decimal';
import {
  parseAmount,
  resolveNumberFormat,
  type DecimalMark,
  type NumberFormatChoice,
} from './_shared/localized-number';

export interface StatsOptions {
  format: NumberFormatChoice;
  decimals: number;
}

export interface StatsResult {
  count: number;
  sum: string;
  mean: string;
  median: string;
  min: string;
  max: string;
  stddevSample: string | null;
  stddevPopulation: string;
  invalid: string[];
  format: DecimalMark;
  ambiguous: boolean;
}

const EXTRA_SCALE = 12;
const TWO: Decimal = { units: 2n, scale: 0 };

function integer(value: number): Decimal {
  return { units: BigInt(value), scale: 0 };
}

function median(sorted: readonly Decimal[]): Decimal {
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle] ?? integer(0);
  if (sorted.length % 2 === 1) return upper;
  const lower = sorted[middle - 1] ?? integer(0);
  const total = add(lower, upper);
  return divide(total, TWO, total.scale + 1);
}

function deviation(
  numerator: Decimal,
  denominator: Decimal,
  decimals: number,
  scale: number,
): string {
  const variance = divide(numerator, denominator, 2 * (decimals + EXTRA_SCALE) + scale);
  return formatDecimal(sqrt(variance, decimals));
}

export function splitValues(input: string): string[] {
  return input
    .split(/[\r\n\t;]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function computeStats(input: string, options: StatsOptions): StatsResult | null {
  const tokens = splitValues(input);
  if (tokens.length === 0) return null;
  const { format, ambiguous } = resolveNumberFormat(tokens, options.format);
  const values: Decimal[] = [];
  const invalid: string[] = [];
  for (const token of tokens) {
    const value = parseAmount(token, format);
    if (value) values.push(value);
    else invalid.push(token);
  }
  if (values.length === 0) return null;

  const sorted = [...values].sort(compare);
  const count = integer(values.length);
  const total = sum(values);
  const squares = sum(values.map((value) => multiply(value, value)));
  const spread = subtract(multiply(count, squares), multiply(total, total));
  const scale = spread.scale;

  return {
    count: values.length,
    sum: formatTrimmed(total),
    mean: formatDecimal(divide(total, count, options.decimals)),
    median: formatTrimmed(median(sorted)),
    min: formatTrimmed(sorted[0] ?? integer(0)),
    max: formatTrimmed(sorted[sorted.length - 1] ?? integer(0)),
    stddevSample:
      values.length > 1
        ? deviation(spread, integer(values.length * (values.length - 1)), options.decimals, scale)
        : null,
    stddevPopulation: deviation(spread, multiply(count, count), options.decimals, scale),
    invalid,
    format,
    ambiguous,
  };
}
