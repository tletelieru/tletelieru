import {
  compact,
  isRepeated,
  randomChars,
  randomDigits,
  weightedSum,
  type FormatStyle,
  type IdValidation,
  type Random,
} from './ids/shared';

export interface CnpjFormatOptions {
  style?: FormatStyle;
}

export interface CnpjGenerateOptions extends CnpjFormatOptions {
  count?: number;
  alphanumeric?: boolean;
}

const BODY = /^[0-9A-Z]{12}\d{2}$/;
const ALPHANUMERIC = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DV1_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const DV2_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function cnpjDigit(chars: string, weights: number[]): string {
  const values = Array.from(chars, (char) => char.charCodeAt(0) - 48);
  const remainder = weightedSum(values, weights) % 11;
  return String(remainder < 2 ? 0 : 11 - remainder);
}

export function computeCnpjDv(base: string): string {
  const normalized = base.toUpperCase();
  const first = cnpjDigit(normalized, DV1_WEIGHTS);
  return first + cnpjDigit(normalized + first, DV2_WEIGHTS);
}

export function parseCnpj(input: string): string | null {
  const clean = compact(input);
  return BODY.test(clean) ? clean : null;
}

export function maskCnpj(value: string, { style = 'full' }: CnpjFormatOptions = {}): string {
  if (style === 'plain') return value;
  if (style === 'dash') return `${value.slice(0, 12)}-${value.slice(12)}`;
  return `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 8)}/${value.slice(8, 12)}-${value.slice(12)}`;
}

export function formatCnpj(input: string, options: CnpjFormatOptions = {}): string | null {
  const value = parseCnpj(input);
  return value ? maskCnpj(value, options) : null;
}

export function isAlphanumericCnpj(value: string): boolean {
  return /[A-Z]/.test(value.slice(0, 12));
}

export function validateCnpj(input: string): IdValidation {
  if (!input.trim()) return { valid: false, reason: 'empty' };
  const value = parseCnpj(input);
  if (!value) return { valid: false, reason: 'format' };
  if (isRepeated(value)) return { valid: false, reason: 'repeated' };
  const expected = computeCnpjDv(value.slice(0, 12));
  if (expected !== value.slice(12)) return { valid: false, reason: 'dv', expected };
  return { valid: true, formatted: maskCnpj(value) };
}

export function generateCnpj(alphanumeric = false, random: Random = Math.random): string {
  const raw = alphanumeric
    ? randomChars(12, ALPHANUMERIC, random)
    : `${randomDigits(8, random)}0001`;
  const base = isRepeated(raw) ? `${raw.slice(0, 11)}${raw[11] === '1' ? '2' : '1'}` : raw;
  return base + computeCnpjDv(base);
}

export function generateCnpjs(
  { count = 1, style = 'full', alphanumeric = false }: CnpjGenerateOptions = {},
  random: Random = Math.random,
): string[] {
  return Array.from({ length: count }, () =>
    maskCnpj(generateCnpj(alphanumeric, random), { style }),
  );
}
