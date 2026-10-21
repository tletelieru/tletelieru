export type Base64Alphabet = 'standard' | 'url';

export const base64Alphabets: readonly Base64Alphabet[] = ['standard', 'url'];

export interface Base64EncodeOptions {
  alphabet?: Base64Alphabet;
  padding?: boolean;
  wrap?: boolean;
}

export const MIME_LINE_LENGTH = 76;

export type Base64DecodeError =
  { code: 'invalidChar'; position: number; char: string } | { code: 'length' } | { code: 'utf8' };

export type Base64BytesResult =
  { ok: true; bytes: Uint8Array } | { ok: false; error: Base64DecodeError };

export type Base64TextResult = { ok: true; text: string } | { ok: false; error: Base64DecodeError };

const STANDARD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const URL_SAFE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

const LOOKUP = (() => {
  const table = new Map<string, number>();
  for (let index = 0; index < 64; index++) {
    table.set(STANDARD[index], index);
    table.set(URL_SAFE[index], index);
  }
  return table;
})();

export function wrapLines(text: string, width = MIME_LINE_LENGTH): string {
  if (text.length <= width) return text;
  const lines: string[] = [];
  for (let index = 0; index < text.length; index += width)
    lines.push(text.slice(index, index + width));
  return lines.join('\r\n');
}

export function encodeBytes(
  bytes: Uint8Array,
  { alphabet = 'standard', padding = true, wrap = false }: Base64EncodeOptions = {},
): string {
  const chars = alphabet === 'url' ? URL_SAFE : STANDARD;
  const parts: string[] = [];
  let index = 0;
  for (; index + 2 < bytes.length; index += 3) {
    const triple = (bytes[index] << 16) | (bytes[index + 1] << 8) | bytes[index + 2];
    parts.push(
      chars[triple >> 18] +
        chars[(triple >> 12) & 63] +
        chars[(triple >> 6) & 63] +
        chars[triple & 63],
    );
  }
  const rest = bytes.length - index;
  if (rest === 1) {
    const value = bytes[index] << 16;
    parts.push(chars[value >> 18] + chars[(value >> 12) & 63] + (padding ? '==' : ''));
  } else if (rest === 2) {
    const value = (bytes[index] << 16) | (bytes[index + 1] << 8);
    parts.push(
      chars[value >> 18] +
        chars[(value >> 12) & 63] +
        chars[(value >> 6) & 63] +
        (padding ? '=' : ''),
    );
  }
  const encoded = parts.join('');
  return wrap ? wrapLines(encoded) : encoded;
}

export function encodeText(text: string, options: Base64EncodeOptions = {}): string {
  return encodeBytes(new TextEncoder().encode(text), options);
}

export function decodeToBytes(input: string): Base64BytesResult {
  const values: number[] = [];
  let paddingAt = -1;
  for (let position = 0; position < input.length; position++) {
    const char = input[position];
    if (/\s/.test(char)) continue;
    if (char === '=') {
      if (paddingAt < 0) paddingAt = position;
      continue;
    }
    const value = LOOKUP.get(char);
    if (value === undefined || paddingAt >= 0) {
      return { ok: false, error: { code: 'invalidChar', position, char } };
    }
    values.push(value);
  }
  if (values.length % 4 === 1) return { ok: false, error: { code: 'length' } };
  const bytes = new Uint8Array(Math.floor((values.length * 3) / 4));
  let offset = 0;
  for (let index = 0; index < values.length; index += 4) {
    const a = values[index];
    const b = values[index + 1];
    const c = values[index + 2] ?? 0;
    const d = values[index + 3] ?? 0;
    const triple = (a << 18) | (b << 12) | (c << 6) | d;
    bytes[offset++] = triple >> 16;
    if (index + 2 < values.length) bytes[offset++] = (triple >> 8) & 255;
    if (index + 3 < values.length) bytes[offset++] = triple & 255;
  }
  return { ok: true, bytes };
}

export function bytesToUtf8(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export function decodeToText(input: string): Base64TextResult {
  const result = decodeToBytes(input);
  if (!result.ok) return result;
  const text = bytesToUtf8(result.bytes);
  return text === null ? { ok: false, error: { code: 'utf8' } } : { ok: true, text };
}

export const DEFAULT_MIME = 'application/octet-stream';

export function toDataUri(base64: string, mime: string = DEFAULT_MIME): string {
  return `data:${mime || DEFAULT_MIME};base64,${base64.replace(/\s+/g, '')}`;
}

export interface Base64Payload {
  mime: string | null;
  payload: string;
  offset: number;
}

export function splitDataUri(input: string): Base64Payload {
  const match = /^(\s*data:([^;,]*)(?:;[^;,]*)*;base64,)/i.exec(input);
  if (!match) return { mime: null, payload: input, offset: 0 };
  return {
    mime: match[2] || DEFAULT_MIME,
    payload: input.slice(match[1].length),
    offset: match[1].length,
  };
}

export function decodeInput(input: string): Base64BytesResult & { mime: string | null } {
  const { mime, payload, offset } = splitDataUri(input);
  const result = decodeToBytes(payload);
  if (result.ok || result.error.code !== 'invalidChar') return { ...result, mime };
  return { ok: false, error: { ...result.error, position: result.error.position + offset }, mime };
}

export function utf8Length(text: string): number {
  return new TextEncoder().encode(text).length;
}

const EXTENSIONS: Record<string, string> = {
  'application/json': 'json',
  'application/pdf': 'pdf',
  'application/zip': 'zip',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'text/csv': 'csv',
  'text/html': 'html',
  'text/plain': 'txt',
};

export function fileNameFor(mime: string | null, base = 'decoded'): string {
  const extension = mime ? EXTENSIONS[mime.toLowerCase()] : undefined;
  return extension ? `${base}.${extension}` : `${base}.bin`;
}
