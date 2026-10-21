import {
  compact,
  groupThousands,
  pick,
  randomDigits,
  randomInt,
  toDigits,
  weightedSum,
  type FormatStyle,
  type IdValidation,
  type Random,
} from './shared';

export const CUIT_PREFIXES = ['20', '23', '24', '27', '30', '33', '34'] as const;
const CUIT_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

export function parseArDni(input: string): string | null {
  const clean = compact(input);
  return /^\d{7,8}$/.test(clean) ? clean : null;
}

export function formatArDni(input: string, style: FormatStyle = 'full'): string | null {
  const digits = parseArDni(input);
  if (!digits) return null;
  return style !== 'plain' ? groupThousands(digits) : digits;
}

export function validateArDni(input: string): IdValidation {
  if (!input.trim()) return { valid: false, reason: 'empty' };
  const digits = parseArDni(input);
  if (!digits) return { valid: false, reason: 'format' };
  return { valid: true, formatted: groupThousands(digits) };
}

export function generateArDni(random: Random = Math.random): string {
  return String(randomInt(10_000_000, 49_999_999, random));
}

export function computeCuitDv(base: string): string | null {
  const result = 11 - (weightedSum(toDigits(base), CUIT_WEIGHTS) % 11);
  if (result === 11) return '0';
  if (result === 10) return null;
  return String(result);
}

export function parseCuit(input: string): string | null {
  const clean = compact(input);
  return /^\d{11}$/.test(clean) ? clean : null;
}

function maskCuit(digits: string, style: FormatStyle): string {
  return style !== 'plain'
    ? `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
    : digits;
}

export function formatCuit(input: string, style: FormatStyle = 'full'): string | null {
  const digits = parseCuit(input);
  return digits ? maskCuit(digits, style) : null;
}

export function validateCuit(input: string): IdValidation {
  if (!input.trim()) return { valid: false, reason: 'empty' };
  const digits = parseCuit(input);
  if (!digits) return { valid: false, reason: 'format' };
  if (!(CUIT_PREFIXES as readonly string[]).includes(digits.slice(0, 2))) {
    return { valid: false, reason: 'format' };
  }
  const expected = computeCuitDv(digits.slice(0, 10));
  if (expected === null) return { valid: false, reason: 'dv' };
  if (expected !== digits.slice(10)) return { valid: false, reason: 'dv', expected };
  return { valid: true, formatted: maskCuit(digits, 'full') };
}

export function generateCuit(random: Random = Math.random): string {
  const prefix = pick(CUIT_PREFIXES, random);
  let body = randomDigits(8, random);
  let dv = computeCuitDv(prefix + body);
  while (dv === null) {
    body = String((Number(body) + 1) % 100_000_000).padStart(8, '0');
    dv = computeCuitDv(prefix + body);
  }
  return prefix + body + dv;
}
