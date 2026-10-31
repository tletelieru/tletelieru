export interface Decimal {
  units: bigint;
  scale: number;
}

export const roundingModes = [
  'halfUp',
  'halfDown',
  'halfEven',
  'up',
  'down',
  'ceiling',
  'floor',
] as const;

export type RoundingMode = (typeof roundingModes)[number];

const PATTERN = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/;
const MAX_EXPONENT = 1000;

export const ZERO: Decimal = { units: 0n, scale: 0 };

export function pow10(exponent: number): bigint {
  return 10n ** BigInt(exponent);
}

function absolute(value: bigint): bigint {
  return value < 0n ? -value : value;
}

export function parseDecimal(text: string): Decimal | null {
  const match = PATTERN.exec(text.trim());
  if (!match) return null;
  const [, sign, whole = '', fraction = '', exponentText] = match;
  if (whole === '' && fraction === '') return null;
  const exponent = Number(exponentText ?? 0);
  if (Math.abs(exponent) > MAX_EXPONENT) return null;
  const digits = BigInt(`${whole}${fraction}`);
  const units = sign === '-' ? -digits : digits;
  const scale = fraction.length - exponent;
  return scale < 0 ? { units: units * pow10(-scale), scale: 0 } : { units, scale };
}

export function formatDecimal({ units, scale }: Decimal): string {
  const digits = absolute(units)
    .toString()
    .padStart(scale + 1, '0');
  const sign = units < 0n ? '-' : '';
  if (scale === 0) return `${sign}${digits}`;
  const split = digits.length - scale;
  return `${sign}${digits.slice(0, split)}.${digits.slice(split)}`;
}

export function normalize({ units, scale }: Decimal): Decimal {
  let value = units;
  let current = scale;
  while (current > 0 && value % 10n === 0n) {
    value /= 10n;
    current--;
  }
  return { units: value, scale: current };
}

export function formatTrimmed(value: Decimal): string {
  return formatDecimal(normalize(value));
}

function alignUnits(a: Decimal, b: Decimal): [bigint, bigint, number] {
  const scale = Math.max(a.scale, b.scale);
  return [a.units * pow10(scale - a.scale), b.units * pow10(scale - b.scale), scale];
}

export function add(a: Decimal, b: Decimal): Decimal {
  const [left, right, scale] = alignUnits(a, b);
  return { units: left + right, scale };
}

export function subtract(a: Decimal, b: Decimal): Decimal {
  const [left, right, scale] = alignUnits(a, b);
  return { units: left - right, scale };
}

export function multiply(a: Decimal, b: Decimal): Decimal {
  return { units: a.units * b.units, scale: a.scale + b.scale };
}

export function negate({ units, scale }: Decimal): Decimal {
  return { units: -units, scale };
}

export function compare(a: Decimal, b: Decimal): number {
  const [left, right] = alignUnits(a, b);
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

export function isZero(value: Decimal): boolean {
  return value.units === 0n;
}

export function sum(values: readonly Decimal[]): Decimal {
  return values.reduce(add, ZERO);
}

export function roundQuotient(
  numerator: bigint,
  denominator: bigint,
  mode: RoundingMode = 'halfUp',
): bigint {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  if (remainder === 0n) return quotient;
  const negative = numerator < 0n !== denominator < 0n;
  const away = negative ? quotient - 1n : quotient + 1n;
  const twice = absolute(remainder) * 2n;
  const size = absolute(denominator);
  switch (mode) {
    case 'up':
      return away;
    case 'down':
      return quotient;
    case 'ceiling':
      return negative ? quotient : away;
    case 'floor':
      return negative ? away : quotient;
    case 'halfUp':
      return twice >= size ? away : quotient;
    case 'halfDown':
      return twice > size ? away : quotient;
    case 'halfEven':
      if (twice === size) return quotient % 2n === 0n ? quotient : away;
      return twice > size ? away : quotient;
  }
}

export function round(value: Decimal, scale: number, mode: RoundingMode = 'halfUp'): Decimal {
  if (scale >= value.scale) {
    return { units: value.units * pow10(scale - value.scale), scale };
  }
  return { units: roundQuotient(value.units, pow10(value.scale - scale), mode), scale };
}

export function divide(
  a: Decimal,
  b: Decimal,
  scale: number,
  mode: RoundingMode = 'halfUp',
): Decimal {
  const numerator = a.units * pow10(scale + b.scale);
  const denominator = b.units * pow10(a.scale);
  return { units: roundQuotient(numerator, denominator, mode), scale };
}

function integerSqrt(value: bigint): bigint {
  if (value < 2n) return value;
  let current = 1n << BigInt(Math.ceil(value.toString(2).length / 2));
  for (;;) {
    const next = (current + value / current) >> 1n;
    if (next >= current) return current;
    current = next;
  }
}

export function sqrt(value: Decimal, scale: number): Decimal {
  const working = Math.max(scale + 2, Math.ceil(value.scale / 2));
  const root = integerSqrt(value.units * pow10(2 * working - value.scale));
  return round({ units: root, scale: working }, scale);
}

export function fromPercent(value: Decimal): Decimal {
  return { units: value.units, scale: value.scale + 2 };
}

export function power(base: Decimal, exponent: number, scale: number): Decimal {
  let result: Decimal = { units: 1n, scale: 0 };
  for (let step = 0; step < exponent; step++) result = round(multiply(result, base), scale);
  return result;
}
