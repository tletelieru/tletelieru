import {
  bumpLastDigit,
  compact,
  isRepeated,
  randomDigits,
  toDigits,
  weightedSum,
  type FormatStyle,
  type IdValidation,
  type Random,
} from './ids/shared';

export interface CpfFormatOptions {
  style?: FormatStyle;
}

export interface CpfGenerateOptions extends CpfFormatOptions {
  count?: number;
}

const SHAPE = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;

function cpfDigit(digits: string): string {
  const firstWeight = digits.length + 1;
  const weights = Array.from({ length: digits.length }, (_, index) => firstWeight - index);
  const remainder = weightedSum(toDigits(digits), weights) % 11;
  return String(remainder < 2 ? 0 : 11 - remainder);
}

export function computeCpfDv(base: string): string {
  const first = cpfDigit(base);
  return first + cpfDigit(base + first);
}

export function parseCpf(input: string): string | null {
  const trimmed = input.trim().replace(/\s+/g, '');
  if (!SHAPE.test(trimmed)) return null;
  return compact(trimmed);
}

export function maskCpf(digits: string, { style = 'full' }: CpfFormatOptions = {}): string {
  if (style === 'plain') return digits;
  if (style === 'dash') return `${digits.slice(0, 9)}-${digits.slice(9)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatCpf(input: string, options: CpfFormatOptions = {}): string | null {
  const digits = parseCpf(input);
  return digits ? maskCpf(digits, options) : null;
}

export function validateCpf(input: string): IdValidation {
  if (!input.trim()) return { valid: false, reason: 'empty' };
  const digits = parseCpf(input);
  if (!digits) return { valid: false, reason: 'format' };
  if (isRepeated(digits)) return { valid: false, reason: 'repeated' };
  const expected = computeCpfDv(digits.slice(0, 9));
  if (expected !== digits.slice(9)) return { valid: false, reason: 'dv', expected };
  return { valid: true, formatted: maskCpf(digits) };
}

export function generateCpf(random: Random = Math.random): string {
  const raw = randomDigits(9, random);
  const base = isRepeated(raw) ? bumpLastDigit(raw) : raw;
  return base + computeCpfDv(base);
}

export function generateCpfs(
  { count = 1, style = 'full' }: CpfGenerateOptions = {},
  random: Random = Math.random,
): string[] {
  return Array.from({ length: count }, () => maskCpf(generateCpf(random), { style }));
}
