export interface RutParts {
  body: string;
  dv: string;
}

export type RutValidation =
  | { valid: true; body: string; dv: string; formatted: string }
  | { valid: false; reason: 'empty' | 'format' | 'dv'; expectedDv?: string };

export interface RutFormatOptions {
  dots?: boolean;
}

export interface RutGenerateOptions extends RutFormatOptions {
  count?: number;
  min?: number;
  max?: number;
}

const SHAPE = /^[0-9][0-9.\s]*-?\s*[0-9kK]$/;

export function computeRutDv(body: string): string {
  let sum = 0;
  let multiplier = 2;
  for (let index = body.length - 1; index >= 0; index--) {
    sum += Number(body[index]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return '0';
  if (remainder === 10) return 'K';
  return String(remainder);
}

export function parseRut(input: string): RutParts | null {
  const trimmed = input.trim();
  if (!SHAPE.test(trimmed)) return null;
  const clean = trimmed.toUpperCase().replace(/[^0-9K]/g, '');
  const body = clean.slice(0, -1).replace(/^0+/, '');
  const dv = clean.slice(-1);
  if (!/^\d{1,8}$/.test(body)) return null;
  return { body, dv };
}

export function joinRut({ body, dv }: RutParts, { dots = true }: RutFormatOptions = {}): string {
  const grouped = dots ? body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : body;
  return `${grouped}-${dv}`;
}

export function formatRut(input: string, options: RutFormatOptions = {}): string | null {
  const parts = parseRut(input);
  return parts ? joinRut(parts, options) : null;
}

export function validateRut(input: string): RutValidation {
  if (!input.trim()) return { valid: false, reason: 'empty' };
  const parts = parseRut(input);
  if (!parts) return { valid: false, reason: 'format' };
  const expectedDv = computeRutDv(parts.body);
  if (expectedDv !== parts.dv) return { valid: false, reason: 'dv', expectedDv };
  return { valid: true, ...parts, formatted: joinRut(parts) };
}

export function generateRuts(
  { count = 1, min = 1_000_000, max = 29_999_999, dots = true }: RutGenerateOptions = {},
  random: () => number = Math.random,
): string[] {
  return Array.from({ length: count }, () => {
    const body = String(min + Math.floor(random() * (max - min + 1)));
    return joinRut({ body, dv: computeRutDv(body) }, { dots });
  });
}
