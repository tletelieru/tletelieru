import {
  compact,
  groupThousands,
  pick,
  randomDigits,
  randomInt,
  type FormatStyle,
  type IdValidation,
  type Random,
} from './shared';

const NIT_WEIGHTS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

export interface NitParts {
  body: string;
  dv: string;
}

export function parseCoCc(input: string): string | null {
  const clean = compact(input);
  return /^\d{6,10}$/.test(clean) ? clean : null;
}

export function formatCoCc(input: string, style: FormatStyle = 'full'): string | null {
  const digits = parseCoCc(input);
  if (!digits) return null;
  return style !== 'plain' ? groupThousands(digits) : digits;
}

export function validateCoCc(input: string): IdValidation {
  if (!input.trim()) return { valid: false, reason: 'empty' };
  const digits = parseCoCc(input);
  if (!digits) return { valid: false, reason: 'format' };
  return { valid: true, formatted: groupThousands(digits) };
}

export function generateCoCc(random: Random = Math.random): string {
  return String(randomInt(10_000_000, 1_299_999_999, random));
}

export function computeNitDv(body: string): string {
  let sum = 0;
  for (let index = 0; index < body.length; index++) {
    sum += Number(body[body.length - 1 - index]) * NIT_WEIGHTS[index];
  }
  const remainder = sum % 11;
  return String(remainder > 1 ? 11 - remainder : remainder);
}

export function parseNit(input: string): NitParts | null {
  const clean = compact(input);
  if (!/^\d{6,16}$/.test(clean)) return null;
  return { body: clean.slice(0, -1), dv: clean.slice(-1) };
}

function joinNit({ body, dv }: NitParts, style: FormatStyle): string {
  if (style === 'plain') return body + dv;
  return `${style === 'full' ? groupThousands(body) : body}-${dv}`;
}

export function formatNit(input: string, style: FormatStyle = 'full'): string | null {
  const parts = parseNit(input);
  return parts ? joinNit(parts, style) : null;
}

export function validateNit(input: string): IdValidation {
  if (!input.trim()) return { valid: false, reason: 'empty' };
  const parts = parseNit(input);
  if (!parts) return { valid: false, reason: 'format' };
  const expected = computeNitDv(parts.body);
  if (expected !== parts.dv) return { valid: false, reason: 'dv', expected };
  return { valid: true, formatted: joinNit(parts, 'full') };
}

export function generateNit(random: Random = Math.random): string {
  const body = pick(['8', '9'] as const, random) + randomDigits(8, random);
  return body + computeNitDv(body);
}
