import {
  compare,
  formatDecimal,
  parseDecimal,
  round,
  type Decimal,
  type RoundingMode,
} from './_shared/decimal';

export const minorDirections = ['toMinor', 'toAmount'] as const;
export type MinorDirection = (typeof minorDirections)[number];

export const minorRoundings = ['strict', 'halfUp', 'halfEven', 'down'] as const;
export type MinorRounding = (typeof minorRoundings)[number];

export type MinorErrorCode = 'invalid' | 'precision' | 'fractional';

export interface MinorError {
  line: number;
  code: MinorErrorCode;
  text: string;
}

export interface MinorResult {
  output: string;
  errors: MinorError[];
}

export interface MinorOptions {
  exponent: number;
  direction: MinorDirection;
  rounding: MinorRounding;
}

function toMinor(
  value: Decimal,
  exponent: number,
  rounding: MinorRounding,
): { minor: bigint } | null {
  const strict = rounding === 'strict';
  const mode: RoundingMode = strict ? 'down' : rounding;
  const rounded = round(value, exponent, mode);
  if (strict && compare(rounded, value) !== 0) return null;
  return { minor: rounded.units };
}

export function convertMinorLine(
  text: string,
  { exponent, direction, rounding }: MinorOptions,
): { output: string } | { code: MinorErrorCode } {
  const value = parseDecimal(text);
  if (!value) return { code: 'invalid' };
  if (direction === 'toMinor') {
    const converted = toMinor(value, exponent, rounding);
    return converted ? { output: converted.minor.toString() } : { code: 'precision' };
  }
  const whole = round(value, 0, 'down');
  if (compare(whole, value) !== 0) return { code: 'fractional' };
  return { output: formatDecimal({ units: whole.units, scale: exponent }) };
}

export function convertMinorUnits(input: string, options: MinorOptions): MinorResult {
  const outputs: string[] = [];
  const errors: MinorError[] = [];
  input.split(/\r?\n/).forEach((raw, index) => {
    const text = raw.trim();
    if (text === '') return;
    const converted = convertMinorLine(text, options);
    if ('output' in converted) outputs.push(converted.output);
    else errors.push({ line: index + 1, code: converted.code, text });
  });
  return { output: outputs.join('\n'), errors };
}
