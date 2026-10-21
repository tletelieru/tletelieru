import {
  compact,
  randomDigits,
  randomInt,
  type FormatStyle,
  type IdValidation,
  type Random,
} from './shared';

const COEFFICIENTS = [2, 1, 2, 1, 2, 1, 2, 1, 2];

export function computeEcCedulaDv(base: string): string {
  let sum = 0;
  for (let index = 0; index < 9; index++) {
    const product = Number(base[index]) * COEFFICIENTS[index];
    sum += product > 9 ? product - 9 : product;
  }
  return String((10 - (sum % 10)) % 10);
}

export function isValidEcProvince(province: number): boolean {
  return (province >= 1 && province <= 24) || province === 30;
}

export function parseEcCedula(input: string): string | null {
  const clean = compact(input);
  if (!/^\d{10}$/.test(clean)) return null;
  if (!isValidEcProvince(Number(clean.slice(0, 2))) || Number(clean[2]) >= 6) return null;
  return clean;
}

function maskCedula(digits: string, style: FormatStyle): string {
  return style !== 'plain' ? `${digits.slice(0, 9)}-${digits.slice(9)}` : digits;
}

export function formatEcCedula(input: string, style: FormatStyle = 'full'): string | null {
  const digits = parseEcCedula(input);
  return digits ? maskCedula(digits, style) : null;
}

export function validateEcCedula(input: string): IdValidation {
  if (!input.trim()) return { valid: false, reason: 'empty' };
  const digits = parseEcCedula(input);
  if (!digits) return { valid: false, reason: 'format' };
  const expected = computeEcCedulaDv(digits);
  if (expected !== digits[9]) return { valid: false, reason: 'dv', expected };
  return { valid: true, formatted: digits };
}

export function generateEcCedula(random: Random = Math.random): string {
  const province = String(randomInt(1, 24, random)).padStart(2, '0');
  const base = province + String(randomInt(0, 5, random)) + randomDigits(6, random);
  return base + computeEcCedulaDv(base);
}
