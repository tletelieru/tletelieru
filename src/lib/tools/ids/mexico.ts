import { compact, pick, randomChars, randomInt, type IdValidation, type Random } from './shared';

export const CURP_STATES = [
  'AS',
  'BC',
  'BS',
  'CC',
  'CL',
  'CM',
  'CS',
  'CH',
  'DF',
  'DG',
  'GT',
  'GR',
  'HG',
  'JC',
  'MC',
  'MN',
  'MS',
  'NT',
  'NL',
  'OC',
  'PL',
  'QT',
  'QR',
  'SP',
  'SL',
  'SR',
  'TC',
  'TS',
  'TL',
  'VZ',
  'YN',
  'ZS',
  'NE',
] as const;

const CURP_DICTIONARY = '0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
const RFC_DICTIONARY = '0123456789ABCDEFGHIJKLMN&OPQRSTUVWXYZ Ñ';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const VOWELS = 'AEIOU';
const CONSONANTS = 'BCDFGHJKLMNPQRSTVWXYZ';
const DATE = '\\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\\d|3[01])';
const CURP_SHAPE = new RegExp(
  `^[A-Z][AEIOUX][A-Z]{2}${DATE}[HMX](?:${CURP_STATES.join('|')})[B-DF-HJ-NP-TV-Z]{3}[A-Z\\d]\\d$`,
);
const RFC_SHAPE = new RegExp(`^[A-ZÑ&]{3,4}${DATE}[A-Z\\d]{2}[\\dA]$`);

function randomDate(random: Random): string {
  const year = String(randomInt(0, 99, random)).padStart(2, '0');
  const month = String(randomInt(1, 12, random)).padStart(2, '0');
  const day = String(randomInt(1, 28, random)).padStart(2, '0');
  return year + month + day;
}

export function computeCurpDv(base: string): string {
  let sum = 0;
  for (let index = 0; index < 17; index++) {
    sum += CURP_DICTIONARY.indexOf(base[index]) * (18 - index);
  }
  return String((10 - (sum % 10)) % 10);
}

export function parseCurp(input: string): string | null {
  const clean = compact(input);
  return CURP_SHAPE.test(clean) ? clean : null;
}

export function formatCurp(input: string): string | null {
  return parseCurp(input);
}

export function validateCurp(input: string): IdValidation {
  if (!input.trim()) return { valid: false, reason: 'empty' };
  const curp = parseCurp(input);
  if (!curp) return { valid: false, reason: 'format' };
  const expected = computeCurpDv(curp);
  if (expected !== curp[17]) return { valid: false, reason: 'dv', expected };
  return { valid: true, formatted: curp };
}

export function generateCurp(random: Random = Math.random): string {
  const date = randomDate(random);
  const homonym =
    Number(date.slice(0, 2)) < 30
      ? randomChars(1, LETTERS, random)
      : randomChars(1, '0123456789', random);
  const base =
    randomChars(1, LETTERS, random) +
    randomChars(1, VOWELS, random) +
    randomChars(2, LETTERS, random) +
    date +
    pick(['H', 'M'] as const, random) +
    pick(CURP_STATES, random) +
    randomChars(3, CONSONANTS, random) +
    homonym;
  return base + computeCurpDv(base);
}

export function computeRfcDv(base: string): string {
  const padded = base.length === 11 ? ` ${base}` : base;
  let sum = 0;
  for (let index = 0; index < 12; index++) {
    sum += RFC_DICTIONARY.indexOf(padded[index]) * (13 - index);
  }
  const result = 11 - (sum % 11);
  if (result === 11) return '0';
  if (result === 10) return 'A';
  return String(result);
}

export function parseRfc(input: string): string | null {
  const clean = compact(input);
  return RFC_SHAPE.test(clean) ? clean : null;
}

export function formatRfc(input: string): string | null {
  return parseRfc(input);
}

export function validateRfc(input: string): IdValidation {
  if (!input.trim()) return { valid: false, reason: 'empty' };
  const rfc = parseRfc(input);
  if (!rfc) return { valid: false, reason: 'format' };
  const expected = computeRfcDv(rfc.slice(0, -1));
  if (expected !== rfc.slice(-1)) return { valid: false, reason: 'dv', expected };
  return { valid: true, formatted: rfc };
}

export function generateRfc(random: Random = Math.random): string {
  const letters = random() < 0.5 ? 4 : 3;
  const base =
    randomChars(letters, LETTERS, random) +
    randomDate(random) +
    randomChars(2, `${LETTERS}0123456789`, random);
  return base + computeRfcDv(base);
}
