export type JsonNode =
  | { type: 'object'; entries: JsonEntry[] }
  | { type: 'array'; items: JsonNode[] }
  | { type: 'string'; raw: string }
  | { type: 'number'; raw: string }
  | { type: 'literal'; raw: 'true' | 'false' | 'null' };

export interface JsonEntry {
  key: string;
  rawKey: string;
  value: JsonNode;
}

type JsonContainer = Extract<JsonNode, { type: 'object' } | { type: 'array' }>;

export type JsonExpected =
  'value' | 'colon' | 'property-name' | 'comma-or-brace' | 'comma-or-bracket';

export type JsonErrorDetail =
  | { code: 'empty' }
  | { code: 'unexpected-end'; expected: JsonExpected }
  | { code: 'unexpected-token'; token: string; expected: JsonExpected }
  | { code: 'unexpected-char'; char: string; expected: JsonExpected }
  | { code: 'unexpected-close'; char: '}' | ']' }
  | { code: 'single-quote-string' }
  | { code: 'single-quote-key' }
  | { code: 'unquoted-key'; key: string }
  | { code: 'trailing-comma'; before: '}' | ']' }
  | { code: 'comment' }
  | { code: 'trailing-content' }
  | { code: 'invalid-literal'; literal: string }
  | { code: 'number-minus' }
  | { code: 'number-leading-zero' }
  | { code: 'number-leading-plus' }
  | { code: 'number-leading-dot' }
  | { code: 'number-fraction' }
  | { code: 'number-exponent' }
  | { code: 'invalid-escape'; escape: string }
  | { code: 'invalid-unicode-escape' }
  | { code: 'string-line-break' }
  | { code: 'unterminated-string' }
  | { code: 'control-char'; char: string };

export type JsonErrorCode = JsonErrorDetail['code'];

export interface JsonErrorPosition {
  offset: number;
  line: number;
  column: number;
  excerpt: string;
}

export type JsonError = JsonErrorDetail & JsonErrorPosition;

export interface JsonParseStats {
  depth: number;
  keys: number;
}

export type JsonParseResult =
  { ok: true; value: JsonNode; stats: JsonParseStats } | { ok: false; error: JsonError };

export type JsonIndent = '2' | '4' | 'tab';
export type JsonMode = 'format' | 'minify' | 'validate';

export interface JsonStringifyOptions {
  indent?: JsonIndent | null;
  sortKeys?: boolean;
}

export interface JsonProcessOptions {
  mode?: JsonMode;
  indent?: JsonIndent;
  sortKeys?: boolean;
}

export interface JsonStats extends JsonParseStats {
  inputBytes: number;
  outputBytes: number;
}

export type JsonProcessResult =
  { ok: true; output: string; stats: JsonStats } | { ok: false; error: JsonError };

class JsonSyntaxError extends Error {
  constructor(
    readonly detail: JsonErrorDetail,
    readonly offset: number,
  ) {
    super(detail.code);
  }
}

const BOM = '\uFEFF';
const WORD = /[A-Za-z_$][\w$]*/y;
const HEX4 = /^[0-9a-fA-F]{4}$/;
const ESCAPES = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't']);

function fail(detail: JsonErrorDetail, offset: number): never {
  throw new JsonSyntaxError(detail, offset);
}

function isWhitespace(code: number): boolean {
  return code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d;
}

function isDigit(code: number): boolean {
  return code >= 0x30 && code <= 0x39;
}

export function displayChar(char: string): string {
  const code = char.codePointAt(0) ?? 0;
  if (code < 0x20 || code === 0x7f || code === 0xa0 || code === 0xfeff || code === 0x200b) {
    return `U+${code.toString(16).toUpperCase().padStart(4, '0')}`;
  }
  return String.fromCodePoint(code);
}

class Scanner {
  pos = 0;

  constructor(readonly text: string) {}

  skipWhitespace(): void {
    const { text } = this;
    while (this.pos < text.length) {
      const code = text.charCodeAt(this.pos);
      if (isWhitespace(code)) {
        this.pos++;
      } else if (code === 0x2f && (text[this.pos + 1] === '/' || text[this.pos + 1] === '*')) {
        fail({ code: 'comment' }, this.pos);
      } else {
        return;
      }
    }
  }

  eof(): boolean {
    return this.pos >= this.text.length;
  }

  peek(): string {
    return this.text[this.pos] ?? '';
  }

  readWord(): string {
    WORD.lastIndex = this.pos;
    const match = WORD.exec(this.text);
    return match ? match[0] : '';
  }

  readString(): string {
    const { text } = this;
    const start = this.pos;
    let index = start + 1;
    while (index < text.length) {
      const code = text.charCodeAt(index);
      if (code === 0x22) {
        this.pos = index + 1;
        return text.slice(start, this.pos);
      }
      if (code === 0x5c) {
        const next = text[index + 1];
        if (next === undefined) break;
        if (next === 'u') {
          if (!HEX4.test(text.slice(index + 2, index + 6))) {
            fail({ code: 'invalid-unicode-escape' }, index);
          }
          index += 6;
          continue;
        }
        if (!ESCAPES.has(next)) fail({ code: 'invalid-escape', escape: `\\${next}` }, index);
        index += 2;
        continue;
      }
      if (code === 0x0a || code === 0x0d) fail({ code: 'string-line-break' }, start);
      if (code < 0x20) fail({ code: 'control-char', char: displayChar(text[index] ?? '') }, index);
      index++;
    }
    return fail({ code: 'unterminated-string' }, start);
  }

  readNumber(): string {
    const { text } = this;
    const start = this.pos;
    let index = start;
    if (text[index] === '-') index++;
    const first = text.charCodeAt(index);
    if (!isDigit(first)) fail({ code: 'number-minus' }, index);
    if (first === 0x30) {
      index++;
      if (isDigit(text.charCodeAt(index))) fail({ code: 'number-leading-zero' }, start);
    } else {
      while (isDigit(text.charCodeAt(index))) index++;
    }
    if (text[index] === '.') {
      index++;
      if (!isDigit(text.charCodeAt(index))) fail({ code: 'number-fraction' }, index);
      while (isDigit(text.charCodeAt(index))) index++;
    }
    if (text[index] === 'e' || text[index] === 'E') {
      index++;
      if (text[index] === '+' || text[index] === '-') index++;
      if (!isDigit(text.charCodeAt(index))) fail({ code: 'number-exponent' }, index);
      while (isDigit(text.charCodeAt(index))) index++;
    }
    this.pos = index;
    return text.slice(start, index);
  }

  unexpected(expected: JsonExpected): never {
    if (this.eof()) fail({ code: 'unexpected-end', expected }, this.pos);
    if (this.peek() === "'") fail({ code: 'single-quote-string' }, this.pos);
    const token = this.readWord();
    if (token) fail({ code: 'unexpected-token', token, expected }, this.pos);
    const char = displayChar(String.fromCodePoint(this.text.codePointAt(this.pos) ?? 0));
    return fail({ code: 'unexpected-char', char, expected }, this.pos);
  }
}

function readScalar(scanner: Scanner): JsonNode {
  const char = scanner.peek();
  if (char === '"') return { type: 'string', raw: scanner.readString() };
  if (char === '-' || isDigit(char.charCodeAt(0))) {
    return { type: 'number', raw: scanner.readNumber() };
  }
  if (char === '+') fail({ code: 'number-leading-plus' }, scanner.pos);
  if (char === '.') fail({ code: 'number-leading-dot' }, scanner.pos);
  const word = scanner.readWord();
  if (word === 'true' || word === 'false' || word === 'null') {
    scanner.pos += word.length;
    return { type: 'literal', raw: word };
  }
  if (word === 'NaN' || word === 'Infinity' || word === 'undefined') {
    fail({ code: 'invalid-literal', literal: word }, scanner.pos);
  }
  if (char === ']' || char === '}') fail({ code: 'unexpected-close', char }, scanner.pos);
  return scanner.unexpected('value');
}

function parseTree(text: string): { value: JsonNode; stats: JsonParseStats } {
  const scanner = new Scanner(text);
  const stack: JsonContainer[] = [];
  let root: JsonNode | undefined;
  let pendingKey: { key: string; rawKey: string } | null = null;
  let lastComma = -1;
  let depth = 0;
  let keys = 0;
  let mode: 'value' | 'key' | 'after' = 'value';

  const attach = (node: JsonNode) => {
    const parent = stack[stack.length - 1];
    if (!parent) {
      root = node;
    } else if (parent.type === 'array') {
      parent.items.push(node);
    } else if (pendingKey) {
      parent.entries.push({ ...pendingKey, value: node });
      pendingKey = null;
    }
  };

  scanner.skipWhitespace();
  if (scanner.eof()) fail({ code: 'empty' }, 0);

  for (;;) {
    scanner.skipWhitespace();
    if (mode === 'value') {
      const char = scanner.peek();
      if (char === '{' || char === '[') {
        const node: JsonContainer =
          char === '{' ? { type: 'object', entries: [] } : { type: 'array', items: [] };
        attach(node);
        stack.push(node);
        depth = Math.max(depth, stack.length);
        scanner.pos++;
        scanner.skipWhitespace();
        if (scanner.peek() === (char === '{' ? '}' : ']')) {
          scanner.pos++;
          stack.pop();
          mode = 'after';
        } else {
          mode = char === '{' ? 'key' : 'value';
        }
        continue;
      }
      if (scanner.eof()) scanner.unexpected('value');
      attach(readScalar(scanner));
      mode = 'after';
      continue;
    }

    if (mode === 'key') {
      const char = scanner.peek();
      if (char === '"') {
        const rawKey = scanner.readString();
        pendingKey = { key: JSON.parse(rawKey) as string, rawKey };
        keys++;
        scanner.skipWhitespace();
        if (scanner.peek() !== ':') scanner.unexpected('colon');
        scanner.pos++;
        mode = 'value';
        continue;
      }
      if (char === '}' && lastComma >= 0) fail({ code: 'trailing-comma', before: '}' }, lastComma);
      if (char === "'") fail({ code: 'single-quote-key' }, scanner.pos);
      const word = scanner.readWord();
      if (word) fail({ code: 'unquoted-key', key: word }, scanner.pos);
      scanner.unexpected('property-name');
    }

    const parent = stack[stack.length - 1];
    if (!parent) {
      if (!scanner.eof()) fail({ code: 'trailing-content' }, scanner.pos);
      break;
    }
    const char = scanner.peek();
    if (char === ',') {
      lastComma = scanner.pos;
      scanner.pos++;
      if (parent.type === 'object') {
        mode = 'key';
      } else {
        scanner.skipWhitespace();
        if (scanner.peek() === ']') fail({ code: 'trailing-comma', before: ']' }, lastComma);
        mode = 'value';
      }
      continue;
    }
    if (char === (parent.type === 'object' ? '}' : ']')) {
      scanner.pos++;
      stack.pop();
      continue;
    }
    scanner.unexpected(parent.type === 'object' ? 'comma-or-brace' : 'comma-or-bracket');
  }

  if (!root) return fail({ code: 'empty' }, 0);
  return { value: root, stats: { depth, keys } };
}

export function stripBom(input: string): string {
  return input.startsWith(BOM) ? input.slice(1) : input;
}

export function locate(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let column = 1;
  const end = Math.min(offset, text.length);
  for (let index = 0; index < end; index++) {
    const code = text.charCodeAt(index);
    if (code === 0x0d && text.charCodeAt(index + 1) === 0x0a) continue;
    if (code === 0x0a || code === 0x0d) {
      line++;
      column = 1;
    } else if (code < 0xdc00 || code > 0xdfff || index === 0) {
      column++;
    }
  }
  return { line, column };
}

export function buildExcerpt(text: string, offset: number, width = 60): string {
  const { line, column } = locate(text, offset);
  let start = offset;
  while (start > 0 && text[start - 1] !== '\n' && text[start - 1] !== '\r') start--;
  let end = start;
  while (end < text.length && text[end] !== '\n' && text[end] !== '\r') end++;
  const chars = Array.from(text.slice(start, end).replace(/\t/g, ' '));
  const caret = column - 1;
  const from = Math.max(0, Math.min(caret - Math.floor(width / 2), chars.length - width));
  const to = Math.min(chars.length, from + width);
  const prefix = from > 0 ? '…' : '';
  const suffix = to < chars.length ? '…' : '';
  const gutter = `${line} | `;
  const source = `${gutter}${prefix}${chars.slice(from, to).join('')}${suffix}`;
  const pointer = `${' '.repeat(gutter.length - 2)}| ${' '.repeat(prefix.length + caret - from)}^`;
  return `${source}\n${pointer}`;
}

export function parseJson(input: string): JsonParseResult {
  const text = stripBom(input);
  try {
    const { value, stats } = parseTree(text);
    return { ok: true, value, stats };
  } catch (error) {
    if (!(error instanceof JsonSyntaxError)) throw error;
    const { line, column } = locate(text, error.offset);
    return {
      ok: false,
      error: {
        ...error.detail,
        offset: error.offset,
        line,
        column,
        excerpt: buildExcerpt(text, error.offset),
      },
    };
  }
}

function compareKeys(a: JsonEntry, b: JsonEntry): number {
  if (a.key < b.key) return -1;
  if (a.key > b.key) return 1;
  return 0;
}

type Task = string | { node: JsonNode; level: number };

export function stringifyJson(
  node: JsonNode,
  { indent = '2', sortKeys = false }: JsonStringifyOptions = {},
): string {
  const unit = indent === null ? '' : indent === 'tab' ? '\t' : ' '.repeat(Number(indent));
  const pretty = unit !== '';
  const colon = pretty ? ': ' : ':';
  const pads: string[] = [''];
  const pad = (level: number) => {
    while (pads.length <= level) pads.push(pads[pads.length - 1] + unit);
    return pads[level] ?? '';
  };
  const out: string[] = [];
  const tasks: Task[] = [{ node, level: 0 }];

  for (let task = tasks.pop(); task !== undefined; task = tasks.pop()) {
    if (typeof task === 'string') {
      out.push(task);
      continue;
    }
    const { node: current, level } = task;
    if (current.type !== 'object' && current.type !== 'array') {
      out.push(current.raw);
      continue;
    }
    const children: (readonly [string, JsonNode])[] =
      current.type === 'object'
        ? (sortKeys ? [...current.entries].sort(compareKeys) : current.entries).map(
            (entry) => [`${entry.rawKey}${colon}`, entry.value] as const,
          )
        : current.items.map((item) => ['', item] as const);
    const [open, close] = current.type === 'object' ? ['{', '}'] : ['[', ']'];
    if (!children.length) {
      out.push(open + close);
      continue;
    }
    const inner = pretty ? `\n${pad(level + 1)}` : '';
    const outer = pretty ? `\n${pad(level)}` : '';
    out.push(open);
    tasks.push(outer + close);
    children.reduceRight<null>((_, [prefix, value], index) => {
      tasks.push({ node: value, level: level + 1 });
      tasks.push((index > 0 ? ',' : '') + inner + prefix);
      return null;
    }, null);
  }
  return out.join('');
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function processJson(
  input: string,
  { mode = 'format', indent = '2', sortKeys = false }: JsonProcessOptions = {},
): JsonProcessResult {
  const parsed = parseJson(input);
  if (!parsed.ok) return parsed;
  const output =
    mode === 'validate'
      ? ''
      : stringifyJson(parsed.value, { indent: mode === 'minify' ? null : indent, sortKeys });
  const inputBytes = byteLength(input);
  return {
    ok: true,
    output,
    stats: {
      ...parsed.stats,
      inputBytes,
      outputBytes: mode === 'validate' ? inputBytes : byteLength(output),
    },
  };
}

export type JsonValueResult = { ok: true; value: unknown } | { ok: false; error: JsonError };

export function parseJsonValue(input: string): JsonValueResult {
  const parsed = parseJson(input);
  if (!parsed.ok) return parsed;
  return { ok: true, value: JSON.parse(stripBom(input)) as unknown };
}
