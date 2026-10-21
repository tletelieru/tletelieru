import type { OptionSpec, OptionValues } from './types';

export const yesNo = ['no', 'yes'] as const;

export function enumOption(key: string, values: readonly string[], fallback?: string): OptionSpec {
  return { key, kind: 'enum', values, default: fallback ?? values[0] ?? '' };
}

export function textOption(key: string, fallback = ''): OptionSpec {
  return { key, kind: 'text', default: fallback };
}

export function isValidOptionValue(spec: OptionSpec, value: string): boolean {
  return spec.kind === 'text' || spec.values.includes(value);
}

export function resolveOptions(
  specs: readonly OptionSpec[],
  raw: Readonly<Record<string, string | undefined>> = {},
): OptionValues {
  const resolved: OptionValues = {};
  for (const spec of specs) {
    const value = Object.hasOwn(raw, spec.key) ? raw[spec.key] : undefined;
    resolved[spec.key] =
      value !== undefined && isValidOptionValue(spec, value) ? value : spec.default;
  }
  return resolved;
}

export function optionValue(options: OptionValues, key: string): string {
  return options[key] ?? '';
}

export function isYes(options: OptionValues, key: string): boolean {
  return options[key] === 'yes';
}
