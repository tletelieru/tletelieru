import { formatDecimal, formatTrimmed, fromPercent, parseDecimal } from './_shared/decimal';
import { clampInt } from './_shared/lines';
import { parseWithSeparators } from './_shared/localized-number';

export const numberLocales = [
  'es-CL',
  'en-US',
  'pt-BR',
  'de-DE',
  'es-ES',
  'es-MX',
  'es-AR',
  'fr-FR',
  'en-GB',
  'en-IN',
  'ja-JP',
] as const;
export type NumberLocale = (typeof numberLocales)[number];

export const numberStyles = ['plain', 'currency', 'percent', 'compact'] as const;
export type NumberStyle = (typeof numberStyles)[number];

export const numberModes = ['format', 'parse'] as const;
export type NumberMode = (typeof numberModes)[number];

export interface NumberOptions {
  locale: NumberLocale;
  style: NumberStyle;
  currency: string;
  decimals: number | null;
}

export interface NumberLineError {
  line: number;
  text: string;
}

export interface NumberResult {
  output: string;
  errors: NumberLineError[];
}

const MAX_FRACTION = 20;

function formatterOptions({ style, currency, decimals }: NumberOptions): Intl.NumberFormatOptions {
  const fixed = decimals === null ? null : clampInt(decimals, 0, MAX_FRACTION);
  const digits: Intl.NumberFormatOptions =
    fixed === null ? {} : { minimumFractionDigits: fixed, maximumFractionDigits: fixed };
  if (style === 'currency') return { style: 'currency', currency, ...digits };
  if (style === 'compact') return { notation: 'compact', ...digits };
  const auto = fixed === null ? { maximumFractionDigits: MAX_FRACTION } : digits;
  return style === 'percent' ? { style: 'percent', ...auto } : auto;
}

export function formatLocalized(text: string, options: NumberOptions): string | null {
  const value = parseDecimal(text);
  if (!value) return null;
  const exact = formatDecimal(value) as Intl.StringNumericLiteral;
  return new Intl.NumberFormat(options.locale, formatterOptions(options)).format(exact);
}

export function localeSeparators(locale: NumberLocale): { group: string; decimal: string } {
  const parts = new Intl.NumberFormat(locale, { useGrouping: true }).formatToParts(1234567.8);
  return {
    group: parts.find((part) => part.type === 'group')?.value ?? ',',
    decimal: parts.find((part) => part.type === 'decimal')?.value ?? '.',
  };
}

export function parseLocalized(text: string, locale: NumberLocale): string | null {
  const { group, decimal } = localeSeparators(locale);
  const parsed = parseWithSeparators(text, group, decimal);
  if (!parsed) return null;
  return formatTrimmed(parsed.percent ? fromPercent(parsed.value) : parsed.value);
}

export function convertNumbers(
  input: string,
  mode: NumberMode,
  options: NumberOptions,
): NumberResult {
  const outputs: string[] = [];
  const errors: NumberLineError[] = [];
  input.split(/\r?\n/).forEach((raw, index) => {
    const text = raw.trim();
    if (text === '') return;
    const output =
      mode === 'format' ? formatLocalized(text, options) : parseLocalized(text, options.locale);
    if (output === null) errors.push({ line: index + 1, text });
    else outputs.push(output);
  });
  return { output: outputs.join('\n'), errors };
}
