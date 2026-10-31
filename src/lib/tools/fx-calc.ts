import {
  add,
  compare,
  divide,
  formatDecimal,
  formatTrimmed,
  fromPercent,
  isZero,
  multiply,
  parseDecimal,
  round,
  subtract,
  ZERO,
  type Decimal,
} from './_shared/decimal';

export const fxSides = ['buy', 'sell'] as const;
export type FxSide = (typeof fxSides)[number];

export interface FxOptions {
  side: FxSide;
  rate: string;
  spread: string;
  fee: string;
  decimals: number;
}

export type FxOptionError = 'rate' | 'spread' | 'fee';

export interface FxRates {
  mid: string;
  effective: string;
  inverseMid: string;
  inverseEffective: string;
}

export interface FxLine {
  amount: string;
  gross: string;
  fee: string;
  total: string;
  spreadCost: string;
}

export interface FxResult {
  rates: FxRates;
  lines: FxLine[];
  invalid: { line: number; text: string }[];
}

const INVERSE_SCALE = 8;
const ONE: Decimal = { units: 1n, scale: 0 };

interface ParsedOptions {
  rate: Decimal;
  effective: Decimal;
  fee: Decimal;
}

function parseOptions(options: FxOptions): ParsedOptions | { error: FxOptionError } {
  const rate = parseDecimal(options.rate);
  if (!rate || compare(rate, ZERO) <= 0) return { error: 'rate' };
  const spread = parseDecimal(options.spread === '' ? '0' : options.spread);
  if (!spread || compare(spread, ZERO) < 0) return { error: 'spread' };
  const share = fromPercent(spread);
  const factor = options.side === 'buy' ? add(ONE, share) : subtract(ONE, share);
  if (compare(factor, ZERO) <= 0) return { error: 'spread' };
  const fee = parseDecimal(options.fee === '' ? '0' : options.fee);
  if (!fee || compare(fee, ZERO) < 0) return { error: 'fee' };
  return { rate, effective: multiply(rate, factor), fee };
}

function inverse(rate: Decimal): string {
  return isZero(rate) ? '0' : formatDecimal(divide(ONE, rate, INVERSE_SCALE));
}

export function calculateFx(
  input: string,
  options: FxOptions,
): FxResult | { error: FxOptionError } {
  const parsed = parseOptions(options);
  if ('error' in parsed) return parsed;
  const { rate, effective, fee } = parsed;
  const { decimals, side } = options;
  const lines: FxLine[] = [];
  const invalid: FxResult['invalid'] = [];

  input.split(/\r?\n/).forEach((raw, index) => {
    const text = raw.trim();
    if (text === '') return;
    const amount = parseDecimal(text);
    if (!amount || compare(amount, ZERO) < 0) {
      invalid.push({ line: index + 1, text });
      return;
    }
    const gross = round(multiply(amount, effective), decimals);
    const atMid = round(multiply(amount, rate), decimals);
    const roundedFee = round(fee, decimals);
    const total = side === 'buy' ? add(gross, roundedFee) : subtract(gross, roundedFee);
    const cost = side === 'buy' ? subtract(gross, atMid) : subtract(atMid, gross);
    lines.push({
      amount: formatTrimmed(amount),
      gross: formatDecimal(gross),
      fee: formatDecimal(roundedFee),
      total: formatDecimal(total),
      spreadCost: formatDecimal(cost),
    });
  });

  return {
    rates: {
      mid: formatTrimmed(rate),
      effective: formatTrimmed(effective),
      inverseMid: inverse(rate),
      inverseEffective: inverse(effective),
    },
    lines,
    invalid,
  };
}
