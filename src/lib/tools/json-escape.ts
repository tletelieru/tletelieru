import { processJson } from './json';

export interface JsonEscapeOptions {
  quotes?: boolean;
  asciiOnly?: boolean;
}

export type JsonUnescapeErrorCode =
  | 'invalid-escape'
  | 'incomplete-escape'
  | 'invalid-unicode'
  | 'lone-surrogate'
  | 'unescaped-quote'
  | 'control-char';

export interface JsonUnescapeError {
  code: JsonUnescapeErrorCode;
  offset: number;
  sequence: string;
}

export type JsonUnescapeResult =
  | { ok: true; text: string; quoted: boolean; escapes: number }
  | { ok: false; error: JsonUnescapeError };

const SHORT_ESCAPES: Readonly<Record<string, string>> = {
  '"': '\\"',
  '\\': '\\\\',
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
};

const SHORT_UNESCAPES: Readonly<Record<string, string>> = {
  '"': '"',
  '\\': '\\',
  '/': '/',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
};

function unicodeEscape(code: number): string {
  return `\\u${code.toString(16).padStart(4, '0')}`;
}

function isHigh(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

function isLow(code: number): boolean {
  return code >= 0xdc00 && code <= 0xdfff;
}

export function escapeJsonString(
  text: string,
  { quotes = false, asciiOnly = false }: JsonEscapeOptions = {},
): string {
  let output = '';
  for (let index = 0; index < text.length; index++) {
    const char = text[index] ?? '';
    const code = text.charCodeAt(index);
    const short = SHORT_ESCAPES[char];
    if (short) {
      output += short;
    } else if (code < 0x20) {
      output += unicodeEscape(code);
    } else if (isHigh(code) && isLow(text.charCodeAt(index + 1))) {
      output += asciiOnly
        ? unicodeEscape(code) + unicodeEscape(text.charCodeAt(index + 1))
        : text.slice(index, index + 2);
      index++;
    } else if (isHigh(code) || isLow(code) || (asciiOnly && code > 0x7e)) {
      output += unicodeEscape(code);
    } else {
      output += char;
    }
  }
  return quotes ? `"${output}"` : output;
}

const HEX4 = /^[0-9a-fA-F]{4}$/;

function bounds(input: string): { start: number; end: number; quoted: boolean } {
  let start = 0;
  let end = input.length;
  while (start < end && /\s/.test(input[start] ?? '')) start++;
  while (end > start && /\s/.test(input[end - 1] ?? '')) end--;
  const quoted = end - start >= 2 && input[start] === '"' && input[end - 1] === '"';
  if (quoted) return { start: start + 1, end: end - 1, quoted };
  return { start: 0, end: input.length, quoted };
}

function failure(code: JsonUnescapeErrorCode, offset: number, sequence: string) {
  return { ok: false as const, error: { code, offset, sequence } };
}

export function unescapeJsonString(input: string): JsonUnescapeResult {
  const { start, end, quoted } = bounds(input);
  let text = '';
  let escapes = 0;
  let index = start;
  const readUnit = (at: number): number | null => {
    const hex = input.slice(at + 2, at + 6);
    if (input[at] !== '\\' || input[at + 1] !== 'u' || at + 6 > end || !HEX4.test(hex)) {
      return null;
    }
    return parseInt(hex, 16);
  };
  while (index < end) {
    const char = input[index] ?? '';
    const code = input.charCodeAt(index);
    if (char !== '\\') {
      if (quoted && char === '"') return failure('unescaped-quote', index, char);
      if (quoted && code < 0x20) return failure('control-char', index, char);
      if (isLow(code)) return failure('lone-surrogate', index, char);
      if (isHigh(code)) {
        if (!isLow(input.charCodeAt(index + 1)) || index + 1 >= end) {
          return failure('lone-surrogate', index, char);
        }
        text += input.slice(index, index + 2);
        index += 2;
        continue;
      }
      text += char;
      index++;
      continue;
    }
    if (index + 1 >= end) return failure('incomplete-escape', index, '\\');
    const next = input[index + 1] ?? '';
    escapes++;
    if (next !== 'u') {
      const value = SHORT_UNESCAPES[next];
      if (value === undefined) return failure('invalid-escape', index, `\\${next}`);
      text += value;
      index += 2;
      continue;
    }
    const unit = readUnit(index);
    if (unit === null) {
      return failure('invalid-unicode', index, input.slice(index, Math.min(end, index + 6)));
    }
    if (isLow(unit)) return failure('lone-surrogate', index, input.slice(index, index + 6));
    if (isHigh(unit)) {
      const low = readUnit(index + 6);
      if (low === null || !isLow(low)) {
        return failure('lone-surrogate', index, input.slice(index, index + 6));
      }
      text += String.fromCharCode(unit, low);
      index += 12;
      continue;
    }
    text += String.fromCharCode(unit);
    index += 6;
  }
  return { ok: true, text, quoted, escapes };
}

export function prettyEmbeddedJson(text: string): string | null {
  const trimmed = text.trim();
  const first = trimmed[0];
  if (first !== '{' && first !== '[') return null;
  const result = processJson(trimmed, { mode: 'format', indent: '2' });
  return result.ok ? result.output : null;
}
