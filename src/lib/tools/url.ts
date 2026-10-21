export type UrlScope = 'component' | 'uri';

export const urlScopes: readonly UrlScope[] = ['component', 'uri'];

export interface UrlCodecOptions {
  scope?: UrlScope;
  form?: boolean;
}

export type UrlIssueCode = 'badEscape' | 'badUtf8' | 'loneSurrogate';

export interface UrlIssue {
  code: UrlIssueCode;
  position: number;
}

export type UrlCodecResult = { ok: true; value: string } | { ok: false; issue: UrlIssue };

const HEX_PAIR = /^[0-9a-fA-F]{2}$/;

function readByte(text: string, index: number): number | null {
  const pair = text.slice(index + 1, index + 3);
  return text[index] === '%' && HEX_PAIR.test(pair) ? parseInt(pair, 16) : null;
}

function sequenceLength(lead: number): number {
  if (lead < 0x80) return 1;
  if (lead >= 0xc2 && lead <= 0xdf) return 2;
  if (lead >= 0xe0 && lead <= 0xef) return 3;
  if (lead >= 0xf0 && lead <= 0xf4) return 4;
  return 0;
}

const strictUtf8 = new TextDecoder('utf-8', { fatal: true });

export function findEscapeIssue(text: string): UrlIssue | null {
  let index = 0;
  while (index < text.length) {
    if (text[index] !== '%') {
      index++;
      continue;
    }
    const start = index;
    const lead = readByte(text, index);
    if (lead === null) return { code: 'badEscape', position: index };
    const length = sequenceLength(lead);
    if (length === 0) return { code: 'badUtf8', position: start };
    const bytes = [lead];
    index += 3;
    for (let part = 1; part < length; part++) {
      if (text[index] !== '%') return { code: 'badUtf8', position: start };
      const next = readByte(text, index);
      if (next === null) return { code: 'badEscape', position: index };
      if ((next & 0xc0) !== 0x80) return { code: 'badUtf8', position: start };
      bytes.push(next);
      index += 3;
    }
    try {
      strictUtf8.decode(Uint8Array.from(bytes));
    } catch {
      return { code: 'badUtf8', position: start };
    }
  }
  return null;
}

export function findLoneSurrogate(text: string): number {
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        index++;
        continue;
      }
      return index;
    }
    if (code >= 0xdc00 && code <= 0xdfff) return index;
  }
  return -1;
}

export function encodeUrlText(
  text: string,
  { scope = 'component', form = false }: UrlCodecOptions = {},
): UrlCodecResult {
  const surrogate = findLoneSurrogate(text);
  if (surrogate >= 0) return { ok: false, issue: { code: 'loneSurrogate', position: surrogate } };
  if (scope === 'uri') {
    const encoded = encodeURI(text);
    return { ok: true, value: form ? encoded.replace(/%20/g, '+') : encoded };
  }
  const encoded = encodeURIComponent(text);
  return { ok: true, value: form ? encoded.replace(/%20/g, '+') : encoded };
}

export function decodeUrlText(
  text: string,
  { scope = 'component', form = false }: UrlCodecOptions = {},
): UrlCodecResult {
  const source = form ? text.replace(/\+/g, ' ') : text;
  const issue = findEscapeIssue(source);
  if (issue) return { ok: false, issue };
  return { ok: true, value: scope === 'uri' ? decodeURI(source) : decodeURIComponent(source) };
}

export interface QueryParam {
  key: string;
  value: string;
  raw: string;
  position: number;
  issue?: UrlIssue;
}

export interface UrlParts {
  href: string;
  protocol: string;
  username: string;
  password: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
}

export type ParsedUrl =
  | { kind: 'url'; parts: UrlParts; params: QueryParam[] }
  | { kind: 'query'; params: QueryParam[] }
  | { kind: 'invalid' }
  | { kind: 'empty' };

function decodePart(text: string, offset: number): { value: string; issue?: UrlIssue } {
  const result = decodeUrlText(text, { form: true });
  if (result.ok) return { value: result.value };
  return {
    value: text,
    issue: { code: result.issue.code, position: result.issue.position + offset },
  };
}

export function parseQuery(query: string, offset = 0): QueryParam[] {
  const params: QueryParam[] = [];
  let position = 0;
  for (const raw of query.split('&')) {
    const start = offset + position;
    position += raw.length + 1;
    if (!raw) continue;
    const equals = raw.indexOf('=');
    const rawKey = equals < 0 ? raw : raw.slice(0, equals);
    const rawValue = equals < 0 ? '' : raw.slice(equals + 1);
    const key = decodePart(rawKey, start);
    const value = decodePart(rawValue, start + equals + 1);
    const issue = key.issue ?? value.issue;
    params.push({
      key: key.value,
      value: value.value,
      raw,
      position: start,
      ...(issue ? { issue } : {}),
    });
  }
  return params;
}

const HIERARCHICAL = /^[a-z][a-z0-9+.-]*:\/\//i;
const OPAQUE = /^(mailto|tel|urn|data|file|blob):/i;

function rawQuery(input: string): { query: string; offset: number } {
  const hash = input.indexOf('#');
  const head = hash < 0 ? input : input.slice(0, hash);
  const mark = head.indexOf('?');
  return mark < 0
    ? { query: '', offset: head.length }
    : { query: head.slice(mark + 1), offset: mark + 1 };
}

export function parseUrl(input: string): ParsedUrl {
  const trimmed = input.trim();
  if (!trimmed) return { kind: 'empty' };
  const lead = input.indexOf(trimmed);
  if (HIERARCHICAL.test(trimmed) || OPAQUE.test(trimmed)) {
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      return { kind: 'invalid' };
    }
    const { query, offset } = rawQuery(trimmed);
    return {
      kind: 'url',
      parts: {
        href: url.href,
        protocol: url.protocol,
        username: url.username,
        password: url.password,
        hostname: url.hostname,
        port: url.port,
        pathname: url.pathname,
        search: url.search,
        hash: url.hash,
      },
      params: parseQuery(query, lead + offset),
    };
  }
  const { query, offset } = trimmed.includes('?')
    ? rawQuery(trimmed)
    : { query: trimmed.replace(/#.*$/, ''), offset: 0 };
  return { kind: 'query', params: parseQuery(query, lead + offset) };
}

export interface QueryRow {
  key: string;
  value: string;
}

function encodeQueryPart(text: string, form: boolean): string {
  const encoded = encodeURIComponent(text.toWellFormed());
  return form ? encoded.replace(/%20/g, '+') : encoded;
}

export function buildQuery(rows: readonly QueryRow[], { form = false } = {}): string {
  return rows
    .filter((row) => row.key !== '' || row.value !== '')
    .map((row) => `${encodeQueryPart(row.key, form)}=${encodeQueryPart(row.value, form)}`)
    .join('&');
}

export function buildUrl(
  base: string,
  rows: readonly QueryRow[],
  options: { form?: boolean } = {},
): string {
  const query = buildQuery(rows, options);
  const trimmed = base.trim();
  const hashAt = trimmed.indexOf('#');
  const hash = hashAt < 0 ? '' : trimmed.slice(hashAt);
  const beforeHash = hashAt < 0 ? trimmed : trimmed.slice(0, hashAt);
  const markAt = beforeHash.indexOf('?');
  const path = markAt < 0 ? beforeHash : beforeHash.slice(0, markAt);
  if (!path && !hash) return query;
  return `${path}${query ? `?${query}` : ''}${hash}`;
}
