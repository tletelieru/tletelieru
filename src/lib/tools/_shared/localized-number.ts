import { parseDecimal, type Decimal } from './decimal';

export type DecimalMark = 'comma' | 'dot';
export type NumberFormatChoice = DecimalMark | 'auto';

export const numberFormatChoices: readonly NumberFormatChoice[] = ['auto', 'comma', 'dot'];

export interface NumberParts {
  negative: boolean;
  body: string;
  percent: boolean;
}

export interface LocalizedNumber {
  value: Decimal;
  percent: boolean;
}

export interface FormatDetection {
  format: DecimalMark;
  ambiguous: boolean;
}

const SHAPE =
  /^([-−+]?)\s*[\p{L}\p{Sc}]*\.?\s*([-−+]?)\s*([\d.,'\s]*\d[\d.,'\s]*?)\s*[\p{L}\p{Sc}%]*\s*([-−]?)$/u;

function escapeForRegex(char: string): string {
  return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function splitNumber(text: string): NumberParts | null {
  const trimmed = text.trim();
  const parenthesized = /^\(.*\)$/.test(trimmed);
  const inner = parenthesized ? trimmed.slice(1, -1) : trimmed;
  const match = SHAPE.exec(inner);
  if (!match) return null;
  const [, leading = '', middle = '', body = '', trailing = ''] = match;
  const signs = [leading, middle, trailing].filter(Boolean);
  if (signs.length > 1) return null;
  const sign = signs[0] ?? '';
  return {
    negative: parenthesized || sign === '-' || sign === '−',
    body: body.replace(/[\s']/g, ''),
    percent: inner.includes('%'),
  };
}

export function parseWithSeparators(
  text: string,
  group: string,
  decimal: string,
): LocalizedNumber | null {
  const parts = splitNumber(text);
  if (!parts) return null;
  const mark = escapeForRegex(decimal);
  const plain = new RegExp(`^(\\d*)(?:${mark}(\\d*))?$`);
  const separator = group.trim() === '' ? null : escapeForRegex(group);
  const grouped = separator
    ? new RegExp(`^\\d+(?:${separator}\\d{2,3})*${separator}\\d{3}(?:${mark}\\d*)?$`)
    : null;
  if (!plain.test(parts.body) && !grouped?.test(parts.body)) return null;
  const canonical = (separator ? parts.body.replaceAll(group, '') : parts.body).replace(
    decimal,
    '.',
  );
  const value = parseDecimal(`${parts.negative ? '-' : ''}${canonical}`);
  return value && { value, percent: parts.percent };
}

export function parseAmount(text: string, format: DecimalMark): Decimal | null {
  const [group, decimal] = format === 'comma' ? ['.', ','] : [',', '.'];
  return parseWithSeparators(text, group, decimal)?.value ?? null;
}

function voteFormat(text: string): DecimalMark | null {
  const body = splitNumber(text)?.body;
  if (!body) return null;
  const commas = body.split(',').length - 1;
  const dots = body.split('.').length - 1;
  if (commas > 0 && dots > 0)
    return body.lastIndexOf(',') > body.lastIndexOf('.') ? 'comma' : 'dot';
  if (commas + dots === 0) return null;
  const separator = commas > 0 ? ',' : '.';
  const asDecimal: DecimalMark = separator === ',' ? 'comma' : 'dot';
  const asGroup: DecimalMark = separator === ',' ? 'dot' : 'comma';
  if (commas + dots > 1) return asGroup;
  const [before = '', after = ''] = body.split(separator);
  const looksGrouped = after.length === 3 && before.length >= 1 && before.length <= 3;
  return looksGrouped && before !== '0' ? null : asDecimal;
}

export function detectNumberFormat(
  values: readonly string[],
  fallback: DecimalMark = 'dot',
): FormatDetection {
  let commas = 0;
  let dots = 0;
  let separated = false;
  for (const value of values) {
    const vote = voteFormat(value);
    if (vote === 'comma') commas++;
    if (vote === 'dot') dots++;
    if (/[.,]/.test(value)) separated = true;
  }
  if (commas === 0 && dots === 0) return { format: fallback, ambiguous: separated };
  return { format: commas >= dots ? 'comma' : 'dot', ambiguous: false };
}

export function resolveNumberFormat(
  values: readonly string[],
  choice: NumberFormatChoice,
  fallback: DecimalMark = 'dot',
): FormatDetection {
  return choice === 'auto'
    ? detectNumberFormat(values, fallback)
    : { format: choice, ambiguous: false };
}
