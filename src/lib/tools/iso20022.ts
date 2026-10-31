export const xmlModes = ['pretty', 'minify'] as const;
export type XmlMode = (typeof xmlModes)[number];

export type XmlErrorCode =
  | 'noRoot'
  | 'multipleRoots'
  | 'textOutsideRoot'
  | 'unclosed'
  | 'mismatch'
  | 'unexpectedClose'
  | 'invalidName'
  | 'badAttribute'
  | 'duplicateAttribute'
  | 'unterminated'
  | 'badEntity'
  | 'cdataOutsideRoot';

export interface XmlError {
  code: XmlErrorCode;
  line: number;
  column: number;
  name?: string;
  expected?: string;
}

interface XmlAttribute {
  name: string;
  raw: string;
  value: string;
}

export type XmlNode =
  | { type: 'element'; name: string; attributes: XmlAttribute[]; children: XmlNode[] }
  | { type: 'text'; raw: string }
  | { type: 'raw'; raw: string; comment: boolean };

type ElementNode = Extract<XmlNode, { type: 'element' }>;

export type XmlParseResult = { ok: true; nodes: XmlNode[] } | { ok: false; error: XmlError };

export interface MessageType {
  id: string;
  family: string;
}

export type Iso20022Result =
  { ok: true; output: string; message: MessageType | null } | { ok: false; error: XmlError };

const NAME = /[\p{L}_:][\p{L}\p{N}_:.\-·]*/uy;
const BOM = String.fromCharCode(0xfeff);
const ENTITY = /^&(?:#\d+|#x[0-9a-fA-F]+|amp|lt|gt|quot|apos);/;
const NAMESPACE = /urn:(?:iso:std:iso:20022:tech:xsd|swift:xsd):([a-z]{4}\.\d{3}\.\d{3}\.\d{2})/;

const ROOT_MESSAGES: Record<string, string> = {
  CstmrCdtTrfInitn: 'pain.001',
  CstmrPmtStsRpt: 'pain.002',
  CstmrDrctDbtInitn: 'pain.008',
  FIToFIPmtStsRpt: 'pacs.002',
  PmtRtr: 'pacs.004',
  FIToFICstmrCdtTrf: 'pacs.008',
  FICdtTrf: 'pacs.009',
  BkToCstmrAcctRpt: 'camt.052',
  BkToCstmrStmt: 'camt.053',
  BkToCstmrDbtCdtNtfctn: 'camt.054',
  FIToFIPmtCxlReq: 'camt.056',
  RsltnOfInvstgtn: 'camt.029',
};

class Parser {
  private index = 0;
  private readonly roots: XmlNode[] = [];
  private readonly stack: { node: ElementNode; start: number }[] = [];
  private rootSeen = false;

  constructor(private readonly text: string) {}

  private fail(code: XmlErrorCode, at: number, extra: Partial<XmlError> = {}): never {
    const before = this.text.slice(0, at).split(/\r\n|\r|\n/);
    throw {
      code,
      line: before.length,
      column: (before[before.length - 1] ?? '').length + 1,
      ...extra,
    } satisfies XmlError;
  }

  private append(node: XmlNode): void {
    const parent = this.stack[this.stack.length - 1];
    (parent ? parent.node.children : this.roots).push(node);
  }

  private readName(): string | null {
    NAME.lastIndex = this.index;
    const match = NAME.exec(this.text);
    if (!match) return null;
    this.index += match[0].length;
    return match[0];
  }

  private skipSpace(): boolean {
    const start = this.index;
    while (/\s/.test(this.text[this.index] ?? '')) this.index++;
    return this.index > start;
  }

  private readUntil(end: string, start: number, comment = false): void {
    const stop = this.text.indexOf(end, this.index);
    if (stop < 0) this.fail('unterminated', start);
    const finish = stop + end.length;
    this.append({ type: 'raw', raw: this.text.slice(start, finish), comment });
    this.index = finish;
  }

  private checkEntities(from: number, to: number): void {
    let at = this.text.indexOf('&', from);
    while (at >= 0 && at < to) {
      if (!ENTITY.test(this.text.slice(at, at + 12))) this.fail('badEntity', at);
      at = this.text.indexOf('&', at + 1);
    }
  }

  private readDoctype(start: number): void {
    let depth = 0;
    for (let at = this.index; at < this.text.length; at++) {
      const char = this.text[at];
      if (char === '[') depth++;
      if (char === ']') depth--;
      if (char === '>' && depth <= 0) {
        this.append({ type: 'raw', raw: this.text.slice(start, at + 1), comment: false });
        this.index = at + 1;
        return;
      }
    }
    this.fail('unterminated', start);
  }

  private readClose(start: number): void {
    this.index += 2;
    const name = this.readName();
    if (!name) this.fail('invalidName', this.index);
    this.skipSpace();
    if (this.text[this.index] !== '>') this.fail('unterminated', start);
    this.index++;
    const top = this.stack.pop();
    if (!top) this.fail('unexpectedClose', start, { name });
    if (top.node.name !== name) {
      this.fail('mismatch', start, { name, expected: top.node.name });
    }
  }

  private readAttribute(attributes: XmlAttribute[]): void {
    const at = this.index;
    const name = this.readName();
    if (!name) this.fail('badAttribute', at);
    this.skipSpace();
    if (this.text[this.index] !== '=') this.fail('badAttribute', at, { name });
    this.index++;
    this.skipSpace();
    const quote = this.text[this.index];
    if (quote !== '"' && quote !== "'") this.fail('badAttribute', at, { name });
    const end = this.text.indexOf(quote, this.index + 1);
    if (end < 0) this.fail('unterminated', at);
    const value = this.text.slice(this.index + 1, end);
    if (value.includes('<')) this.fail('badAttribute', at, { name });
    this.checkEntities(this.index + 1, end);
    if (attributes.some((attribute) => attribute.name === name)) {
      this.fail('duplicateAttribute', at, { name });
    }
    attributes.push({ name, raw: this.text.slice(at, end + 1).replace(/\s*=\s*/, '='), value });
    this.index = end + 1;
  }

  private readOpen(start: number): void {
    this.index++;
    const name = this.readName();
    if (!name) this.fail('invalidName', start);
    if (this.stack.length === 0 && this.rootSeen) this.fail('multipleRoots', start, { name });
    const node: ElementNode = { type: 'element', name, attributes: [], children: [] };
    for (;;) {
      const spaced = this.skipSpace();
      const char = this.text[this.index];
      if (char === undefined) this.fail('unterminated', start);
      if (char === '>' || (char === '/' && this.text[this.index + 1] === '>')) break;
      if (!spaced) this.fail('badAttribute', this.index);
      this.readAttribute(node.attributes);
    }
    this.append(node);
    if (this.stack.length === 0) this.rootSeen = true;
    if (this.text[this.index] === '/') {
      this.index += 2;
      return;
    }
    this.index++;
    this.stack.push({ node, start });
  }

  private readText(): void {
    const start = this.index;
    const next = this.text.indexOf('<', start);
    const end = next < 0 ? this.text.length : next;
    const raw = this.text.slice(start, end);
    this.index = end;
    if (this.stack.length === 0) {
      if (raw.trim() !== '') this.fail('textOutsideRoot', start + raw.search(/\S/));
      return;
    }
    this.checkEntities(start, end);
    this.append({ type: 'text', raw });
  }

  private step(): void {
    const start = this.index;
    if (this.text[start] !== '<') {
      this.readText();
    } else if (this.text.startsWith('<?', start)) {
      this.readUntil('?>', start);
    } else if (this.text.startsWith('<!--', start)) {
      this.readUntil('-->', start, true);
    } else if (this.text.startsWith('<![CDATA[', start)) {
      if (this.stack.length === 0) this.fail('cdataOutsideRoot', start);
      this.readUntil(']]>', start);
    } else if (this.text.startsWith('<!', start)) {
      this.readDoctype(start);
    } else if (this.text.startsWith('</', start)) {
      this.readClose(start);
    } else {
      this.readOpen(start);
    }
  }

  parse(): XmlNode[] {
    while (this.index < this.text.length) this.step();
    const open = this.stack[this.stack.length - 1];
    if (open) this.fail('unclosed', open.start, { name: open.node.name });
    if (!this.rootSeen) this.fail('noRoot', this.text.length);
    return this.roots;
  }
}

function isXmlError(error: unknown): error is XmlError {
  return typeof error === 'object' && error !== null && 'code' in error && 'line' in error;
}

function stripBom(input: string): string {
  return input.startsWith(BOM) ? input.slice(1) : input;
}

export function parseXml(input: string): XmlParseResult {
  try {
    return { ok: true, nodes: new Parser(stripBom(input)).parse() };
  } catch (error) {
    if (isXmlError(error)) return { ok: false, error };
    throw error;
  }
}

function openTag({ name, attributes }: ElementNode): string {
  return [name, ...attributes.map((attribute) => attribute.raw)].join(' ');
}

function isBlank(node: XmlNode): boolean {
  return node.type === 'text' && node.raw.trim() === '';
}

function hasOwnText(node: ElementNode): boolean {
  return node.children.some(
    (child) =>
      (child.type === 'text' && child.raw.trim() !== '') ||
      (child.type === 'raw' && child.raw.startsWith('<![CDATA[')),
  );
}

function inline(node: XmlNode): string {
  if (node.type !== 'element') return node.raw;
  if (node.children.length === 0) return `<${openTag(node)}/>`;
  return `<${openTag(node)}>${node.children.map(inline).join('')}</${node.name}>`;
}

function pretty(node: XmlNode, depth: number, indent: string): string[] {
  const pad = indent.repeat(depth);
  if (node.type === 'text') return node.raw.trim() === '' ? [] : [`${pad}${node.raw.trim()}`];
  if (node.type === 'raw') return [`${pad}${node.raw}`];
  const children = node.children.filter((child) => !isBlank(child));
  if (children.length === 0) return [`${pad}<${openTag(node)}/>`];
  if (hasOwnText(node)) return [`${pad}${inline(node)}`];
  return [
    `${pad}<${openTag(node)}>`,
    ...children.flatMap((child) => pretty(child, depth + 1, indent)),
    `${pad}</${node.name}>`,
  ];
}

function minified(node: XmlNode): string {
  if (node.type === 'text') return node.raw;
  if (node.type === 'raw') return node.comment ? '' : node.raw;
  if (hasOwnText(node)) return inline(node);
  const children = node.children.filter((child) => !isBlank(child));
  if (children.length === 0) return `<${openTag(node)}/>`;
  return `<${openTag(node)}>${children.map(minified).join('')}</${node.name}>`;
}

function elementsOf(nodes: readonly XmlNode[]): ElementNode[] {
  return nodes.flatMap((node) =>
    node.type === 'element' ? [node, ...elementsOf(node.children)] : [],
  );
}

function localName(name: string): string {
  return name.slice(name.indexOf(':') + 1);
}

function toMessage(id: string): MessageType {
  return { id, family: id.split('.').slice(0, 2).join('.') };
}

export function detectMessage(nodes: readonly XmlNode[]): MessageType | null {
  const elements = elementsOf(nodes);
  const ids = elements.flatMap((element) =>
    element.attributes.flatMap(({ name, value }) => {
      const match = name === 'xmlns' || name.startsWith('xmlns:') ? NAMESPACE.exec(value) : null;
      return match?.[1] ? [match[1]] : [];
    }),
  );
  const main = ids.find((id) => !id.startsWith('head.')) ?? ids[0];
  if (main) return toMessage(main);
  for (const element of elements) {
    const family = ROOT_MESSAGES[localName(element.name)];
    if (family) return { id: family, family };
  }
  return null;
}

export function processIso20022(input: string, mode: XmlMode, indent = 2): Iso20022Result {
  const parsed = parseXml(input);
  if (!parsed.ok) return parsed;
  const nodes = parsed.nodes;
  const output =
    mode === 'pretty'
      ? nodes.flatMap((node) => pretty(node, 0, ' '.repeat(indent))).join('\n')
      : nodes.map(minified).join('');
  return { ok: true, output, message: detectMessage(nodes) };
}
