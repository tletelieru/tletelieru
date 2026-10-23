export type NumberBase = 2 | 8 | 10 | 16 | 36;
export type InputBase = 'auto' | `${NumberBase}`;
export type BitWidth = '8' | '16' | '32' | '64';

export const inputBases: readonly InputBase[] = ['auto', '2', '8', '10', '16', '36'];
export const bitWidths: readonly BitWidth[] = ['8', '16', '32', '64'];

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

export type NumberBaseError =
  { code: 'empty' } | { code: 'invalidDigit'; char: string; base: NumberBase };

export interface ParsedNumber {
  value: bigint;
  base: NumberBase;
}

export type ParseNumberResult =
  { ok: true; number: ParsedNumber } | { ok: false; error: NumberBaseError };

const PREFIXES: [RegExp, NumberBase][] = [
  [/^0x/i, 16],
  [/^0b/i, 2],
  [/^0o/i, 8],
];

export function parseNumber(input: string, base: InputBase = 'auto'): ParseNumberResult {
  let text = input.trim().replace(/[\s_']/g, '');
  if (!text) return { ok: false, error: { code: 'empty' } };
  const negative = text.startsWith('-');
  if (negative || text.startsWith('+')) text = text.slice(1);
  let radix: NumberBase = base === 'auto' ? 10 : (Number(base) as NumberBase);
  for (const [prefix, prefixBase] of PREFIXES) {
    if ((base === 'auto' || radix === prefixBase) && prefix.test(text)) {
      radix = prefixBase;
      text = text.slice(2);
      break;
    }
  }
  if (!text) return { ok: false, error: { code: 'empty' } };
  let value = 0n;
  const big = BigInt(radix);
  for (const char of text.toLowerCase()) {
    const digit = DIGITS.indexOf(char);
    if (digit < 0 || digit >= radix)
      return { ok: false, error: { code: 'invalidDigit', char, base: radix } };
    value = value * big + BigInt(digit);
  }
  return { ok: true, number: { value: negative ? -value : value, base: radix } };
}

export function toBase(value: bigint, base: NumberBase): string {
  return value < 0n ? `-${(-value).toString(base)}` : value.toString(base);
}

export function groupDigits(text: string, size: number, separator = ' '): string {
  const negative = text.startsWith('-');
  const digits = negative ? text.slice(1) : text;
  const groups: string[] = [];
  for (let end = digits.length; end > 0; end -= size)
    groups.unshift(digits.slice(Math.max(0, end - size), end));
  return `${negative ? '-' : ''}${groups.join(separator)}`;
}

export interface TwosComplement {
  width: number;
  fits: boolean;
  unsigned: bigint;
  signed: bigint;
  binary: string;
  hex: string;
}

export function twosComplement(value: bigint, width: number): TwosComplement {
  const bits = BigInt(width);
  const modulus = 1n << bits;
  const min = -(1n << (bits - 1n));
  const fits = value >= min && value < modulus;
  const unsigned = ((value % modulus) + modulus) % modulus;
  const signed = unsigned >= modulus / 2n ? unsigned - modulus : unsigned;
  return {
    width,
    fits,
    unsigned,
    signed,
    binary: unsigned.toString(2).padStart(width, '0'),
    hex: unsigned.toString(16).padStart(width / 4, '0'),
  };
}

export const byteUnits = ['B', 'KB', 'MB', 'GB', 'TB', 'KiB', 'MiB', 'GiB', 'TiB'] as const;
export type ByteUnit = (typeof byteUnits)[number];

const UNIT_FACTORS: Record<ByteUnit, number> = {
  B: 1,
  KB: 1e3,
  MB: 1e6,
  GB: 1e9,
  TB: 1e12,
  KiB: 1024,
  MiB: 1024 ** 2,
  GiB: 1024 ** 3,
  TiB: 1024 ** 4,
};

const UNIT_ALIASES: Record<string, ByteUnit> = {
  b: 'B',
  byte: 'B',
  bytes: 'B',
  k: 'KB',
  kb: 'KB',
  m: 'MB',
  mb: 'MB',
  g: 'GB',
  gb: 'GB',
  t: 'TB',
  tb: 'TB',
  kib: 'KiB',
  mib: 'MiB',
  gib: 'GiB',
  tib: 'TiB',
};

export type ByteParseError = { code: 'empty' } | { code: 'invalidSize'; input: string };

export type ByteParseResult = { ok: true; bytes: number } | { ok: false; error: ByteParseError };

export function parseByteSize(input: string, fallback: ByteUnit = 'B'): ByteParseResult {
  const text = input.trim().replace(/,/g, '');
  if (!text) return { ok: false, error: { code: 'empty' } };
  const match = /^(\d+(?:\.\d+)?|\.\d+)(?:e([+-]?\d+))?\s*([a-z]*)$/i.exec(text);
  if (!match) return { ok: false, error: { code: 'invalidSize', input: text } };
  const unitText = (match[3] ?? '').toLowerCase();
  const unit = unitText ? UNIT_ALIASES[unitText] : fallback;
  if (!unit) return { ok: false, error: { code: 'invalidSize', input: text } };
  const amount = Number(`${match[1]}${match[2] ? `e${match[2]}` : ''}`);
  return { ok: true, bytes: amount * UNIT_FACTORS[unit] };
}

export function convertBytes(bytes: number): { unit: ByteUnit; value: number }[] {
  return byteUnits.map((unit) => ({ unit, value: bytes / UNIT_FACTORS[unit] }));
}

export function formatAmount(value: number): string {
  if (value === 0) return '0';
  if (Number.isInteger(value) && Math.abs(value) < 1e21) return value.toString();
  const fixed = Number(value.toPrecision(12));
  return Math.abs(fixed) < 1e-6 ? fixed.toExponential() : fixed.toString();
}

export function humanBytes(bytes: number, binary = true): string {
  const units: ByteUnit[] = binary
    ? ['B', 'KiB', 'MiB', 'GiB', 'TiB']
    : ['B', 'KB', 'MB', 'GB', 'TB'];
  const step = binary ? 1024 : 1000;
  let index = 0;
  let value = bytes;
  while (Math.abs(value) >= step && index < units.length - 1) {
    value /= step;
    index++;
  }
  return `${Number(value.toFixed(2))} ${units[index]}`;
}
