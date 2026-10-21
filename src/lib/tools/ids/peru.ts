import {
  compact,
  pick,
  randomDigits,
  randomInt,
  toDigits,
  weightedSum,
  type FormatStyle,
  type IdValidation,
  type Random,
} from './shared';

export const RUC_PREFIXES = ['10', '15', '17', '20'] as const;
const RUC_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
const DNI_WEIGHTS = [3, 2, 7, 6, 5, 4, 3, 2];
const DNI_NUMBERS = '67890112345';
const DNI_LETTERS = 'KABCDEFGHIJ';

export interface PeDniParts {
  body: string;
  check: string;
}

export function computePeDniChecks(body: string): { number: string; letter: string } {
  const key = 11 - (weightedSum(toDigits(body), DNI_WEIGHTS) % 11);
  const index = key === 11 ? 0 : key;
  return { number: DNI_NUMBERS[index], letter: DNI_LETTERS[index] };
}

export function parsePeDni(input: string): PeDniParts | null {
  const clean = compact(input);
  const match = /^(\d{8})([0-9A-K])?$/.exec(clean);
  return match ? { body: match[1], check: match[2] ?? '' } : null;
}

function joinPeDni({ body, check }: PeDniParts, style: FormatStyle): string {
  if (!check) return body;
  return style !== 'plain' ? `${body}-${check}` : body + check;
}

export function formatPeDni(input: string, style: FormatStyle = 'full'): string | null {
  const parts = parsePeDni(input);
  return parts ? joinPeDni(parts, style) : null;
}

export function validatePeDni(input: string): IdValidation {
  if (!input.trim()) return { valid: false, reason: 'empty' };
  const parts = parsePeDni(input);
  if (!parts) return { valid: false, reason: 'format' };
  if (parts.check) {
    const { number, letter } = computePeDniChecks(parts.body);
    if (parts.check !== number && parts.check !== letter) {
      return { valid: false, reason: 'dv', expected: `${number}/${letter}` };
    }
  }
  return { valid: true, formatted: joinPeDni(parts, 'full') };
}

export function generatePeDni(random: Random = Math.random): string {
  return String(randomInt(10_000_000, 79_999_999, random));
}

export function computeRucDv(base: string): string {
  const result = 11 - (weightedSum(toDigits(base), RUC_WEIGHTS) % 11);
  if (result === 10) return '0';
  if (result === 11) return '1';
  return String(result);
}

export function parseRuc(input: string): string | null {
  const clean = compact(input);
  return /^\d{11}$/.test(clean) ? clean : null;
}

export function formatRuc(input: string): string | null {
  return parseRuc(input);
}

export function validateRuc(input: string): IdValidation {
  if (!input.trim()) return { valid: false, reason: 'empty' };
  const digits = parseRuc(input);
  if (!digits) return { valid: false, reason: 'format' };
  if (!(RUC_PREFIXES as readonly string[]).includes(digits.slice(0, 2))) {
    return { valid: false, reason: 'format' };
  }
  const expected = computeRucDv(digits.slice(0, 10));
  if (expected !== digits.slice(10)) return { valid: false, reason: 'dv', expected };
  return { valid: true, formatted: digits };
}

export function generateRuc(random: Random = Math.random): string {
  const base = pick(['10', '20'] as const, random) + randomDigits(8, random);
  return base + computeRucDv(base);
}
