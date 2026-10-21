export type Random = () => number;

export type IdValidation =
  | { valid: true; formatted: string }
  | { valid: false; reason: 'empty' | 'format' | 'repeated' | 'dv'; expected?: string };

export function randomInt(min: number, max: number, random: Random = Math.random): number {
  return min + Math.floor(random() * (max - min + 1));
}

export function randomChars(
  length: number,
  alphabet: string,
  random: Random = Math.random,
): string {
  return Array.from({ length }, () => alphabet[randomInt(0, alphabet.length - 1, random)]).join('');
}

export function randomDigits(length: number, random: Random = Math.random): string {
  return randomChars(length, '0123456789', random);
}

export function pick<T>(items: readonly T[], random: Random = Math.random): T {
  return items[randomInt(0, items.length - 1, random)];
}

export function compact(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[\s.\-/]/g, '');
}

export function isRepeated(value: string): boolean {
  return value.length > 1 && /^(.)\1*$/.test(value);
}

export function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function weightedSum(values: number[], weights: readonly number[]): number {
  return values.reduce((sum, value, index) => sum + value * weights[index], 0);
}

export function toDigits(value: string): number[] {
  return Array.from(value, Number);
}

export function bumpLastDigit(digits: string): string {
  return digits.slice(0, -1) + String((Number(digits.slice(-1)) + 1) % 10);
}

export const formatStyles = ['full', 'dash', 'plain'] as const;

export type FormatStyle = (typeof formatStyles)[number];

export function toFormatStyle(value: string, supported: readonly FormatStyle[]): FormatStyle {
  const match = supported.find((style) => style === value);
  return match ?? supported[0];
}
