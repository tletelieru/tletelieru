import {
  compact,
  groupThousands,
  randomInt,
  toDigits,
  weightedSum,
  type FormatStyle,
  type IdValidation,
  type Random,
} from './shared';

const CI_WEIGHTS = [2, 9, 8, 7, 6, 3, 4];

export interface UyCiParts {
  body: string;
  dv: string;
}

export function computeUyCiDv(body: string): string {
  const padded = body.padStart(7, '0');
  return String((10 - (weightedSum(toDigits(padded), CI_WEIGHTS) % 10)) % 10);
}

export function parseUyCi(input: string): UyCiParts | null {
  const clean = compact(input);
  if (!/^\d{7,8}$/.test(clean)) return null;
  return { body: clean.slice(0, -1).replace(/^0+(?=\d)/, ''), dv: clean.slice(-1) };
}

function joinUyCi({ body, dv }: UyCiParts, style: FormatStyle): string {
  if (style === 'plain') return body + dv;
  return `${style === 'full' ? groupThousands(body) : body}-${dv}`;
}

export function formatUyCi(input: string, style: FormatStyle = 'full'): string | null {
  const parts = parseUyCi(input);
  return parts ? joinUyCi(parts, style) : null;
}

export function validateUyCi(input: string): IdValidation {
  if (!input.trim()) return { valid: false, reason: 'empty' };
  const parts = parseUyCi(input);
  if (!parts) return { valid: false, reason: 'format' };
  const expected = computeUyCiDv(parts.body);
  if (expected !== parts.dv) return { valid: false, reason: 'dv', expected };
  return { valid: true, formatted: joinUyCi(parts, 'full') };
}

export function generateUyCi(random: Random = Math.random): string {
  const body = String(randomInt(1_000_000, 6_999_999, random));
  return body + computeUyCiDv(body);
}
