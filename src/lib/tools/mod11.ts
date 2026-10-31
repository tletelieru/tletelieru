export const mod11Directions = ['right', 'left'] as const;
export type Mod11Direction = (typeof mod11Directions)[number];

export const mod11Results = ['complement', 'remainder'] as const;
export type Mod11Result = (typeof mod11Results)[number];

export interface Mod11Options {
  weights: string;
  direction: Mod11Direction;
  result: Mod11Result;
  ten: string;
  eleven: string;
}

export interface Mod11Step {
  digit: number;
  weight: number;
  product: number;
}

export interface Mod11Calculation {
  input: string;
  steps: Mod11Step[];
  sum: number;
  remainder: number;
  value: number;
  check: string;
}

export const mod11Presets = {
  rut: { weights: '2,3,4,5,6,7', direction: 'right', result: 'complement', ten: 'K', eleven: '0' },
  isbn10: {
    weights: '10,9,8,7,6,5,4,3,2',
    direction: 'left',
    result: 'complement',
    ten: 'X',
    eleven: '0',
  },
  cpf: {
    weights: '10,9,8,7,6,5,4,3,2',
    direction: 'left',
    result: 'complement',
    ten: '0',
    eleven: '0',
  },
} as const satisfies Record<string, Mod11Options>;

export type Mod11Preset = keyof typeof mod11Presets;
export const mod11PresetIds = Object.keys(mod11Presets) as Mod11Preset[];

export function parseWeights(text: string): number[] | null {
  const parts = text.split(/[\s,;]+/).filter(Boolean);
  if (parts.length === 0 || parts.some((part) => !/^\d{1,3}$/.test(part))) return null;
  return parts.map(Number);
}

export function computeMod11(input: string, options: Mod11Options): Mod11Calculation | null {
  const weights = parseWeights(options.weights);
  const digits = input.replace(/[\s.-]/g, '');
  if (!weights || !/^\d+$/.test(digits)) return null;
  const ordered = Array.from(digits, Number);
  if (options.direction === 'right') ordered.reverse();
  const steps = ordered.map((digit, index) => {
    const weight = weights[index % weights.length] ?? 0;
    return { digit, weight, product: digit * weight };
  });
  const sum = steps.reduce((total, step) => total + step.product, 0);
  const remainder = sum % 11;
  const value = options.result === 'complement' ? 11 - remainder : remainder;
  const check = value === 11 ? options.eleven : value === 10 ? options.ten : String(value);
  return { input: digits, steps, sum, remainder, value, check };
}

export function computeMod11Lines(
  input: string,
  options: Mod11Options,
): (Mod11Calculation | { input: string; invalid: true })[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => computeMod11(line, options) ?? { input: line, invalid: true });
}
