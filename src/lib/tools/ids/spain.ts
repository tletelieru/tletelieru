import {
  compact,
  pick,
  randomDigits,
  type FormatStyle,
  type IdValidation,
  type Random,
} from './shared';

const LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
const NIE_PREFIXES = ['X', 'Y', 'Z'] as const;

export interface SpanishIdParts {
  prefix: string;
  number: string;
  letter: string;
}

export function computeDniLetter(number: string): string {
  return LETTERS[Number(number) % 23];
}

export function computeNieLetter(prefix: string, number: string): string {
  return computeDniLetter(String(NIE_PREFIXES.indexOf(prefix as 'X')) + number);
}

export function parseEsDni(input: string): SpanishIdParts | null {
  const match = /^(\d{8})([A-Z])$/.exec(compact(input));
  return match ? { prefix: '', number: match[1], letter: match[2] } : null;
}

export function parseNie(input: string): SpanishIdParts | null {
  const match = /^([XYZ])(\d{7})([A-Z])$/.exec(compact(input));
  return match ? { prefix: match[1], number: match[2], letter: match[3] } : null;
}

export function parseNif(input: string): SpanishIdParts | null {
  return parseEsDni(input) ?? parseNie(input);
}

function joinSpanishId({ prefix, number, letter }: SpanishIdParts, style: FormatStyle): string {
  if (style === 'plain') return prefix + number + letter;
  return prefix ? `${prefix}-${number}-${letter}` : `${number}-${letter}`;
}

function expectedLetter({ prefix, number }: SpanishIdParts): string {
  return prefix ? computeNieLetter(prefix, number) : computeDniLetter(number);
}

function validateParts(input: string, parse: (value: string) => SpanishIdParts | null) {
  if (!input.trim()) return { valid: false, reason: 'empty' } as const;
  const parts = parse(input);
  if (!parts) return { valid: false, reason: 'format' } as const;
  const expected = expectedLetter(parts);
  if (expected !== parts.letter) return { valid: false, reason: 'dv', expected } as const;
  return { valid: true, formatted: joinSpanishId(parts, 'plain') } as const;
}

export function formatEsDni(input: string, style: FormatStyle = 'full'): string | null {
  const parts = parseEsDni(input);
  return parts ? joinSpanishId(parts, style) : null;
}

export function formatNie(input: string, style: FormatStyle = 'full'): string | null {
  const parts = parseNie(input);
  return parts ? joinSpanishId(parts, style) : null;
}

export function formatNif(input: string, style: FormatStyle = 'full'): string | null {
  const parts = parseNif(input);
  return parts ? joinSpanishId(parts, style) : null;
}

export function validateEsDni(input: string): IdValidation {
  return validateParts(input, parseEsDni);
}

export function validateNie(input: string): IdValidation {
  return validateParts(input, parseNie);
}

export function validateNif(input: string): IdValidation {
  return validateParts(input, parseNif);
}

export function generateEsDni(random: Random = Math.random): string {
  const number = randomDigits(8, random);
  return number + computeDniLetter(number);
}

export function generateNie(random: Random = Math.random): string {
  const prefix = pick(NIE_PREFIXES, random);
  const number = randomDigits(7, random);
  return prefix + number + computeNieLetter(prefix, number);
}

export function generateNif(random: Random = Math.random): string {
  return random() < 0.5 ? generateEsDni(random) : generateNie(random);
}
