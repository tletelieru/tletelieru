export type HtmlEncodeScope = 'minimal' | 'non-ascii';
export type HtmlEncodeFormat = 'named' | 'decimal' | 'hex';

export const htmlEncodeScopes: readonly HtmlEncodeScope[] = ['minimal', 'non-ascii'];
export const htmlEncodeFormats: readonly HtmlEncodeFormat[] = ['named', 'decimal', 'hex'];

export interface HtmlEncodeOptions {
  scope?: HtmlEncodeScope;
  format?: HtmlEncodeFormat;
}

export type HtmlEntityIssueCode = 'unknown-entity' | 'missing-semicolon' | 'invalid-code-point';

export interface HtmlEntityIssue {
  code: HtmlEntityIssueCode;
  entity: string;
  offset: number;
}

export interface HtmlDecodeResult {
  output: string;
  decoded: number;
  issues: HtmlEntityIssue[];
}

const LATIN1 = [
  'nbsp',
  'iexcl',
  'cent',
  'pound',
  'curren',
  'yen',
  'brvbar',
  'sect',
  'uml',
  'copy',
  'ordf',
  'laquo',
  'not',
  'shy',
  'reg',
  'macr',
  'deg',
  'plusmn',
  'sup2',
  'sup3',
  'acute',
  'micro',
  'para',
  'middot',
  'cedil',
  'sup1',
  'ordm',
  'raquo',
  'frac14',
  'frac12',
  'frac34',
  'iquest',
  'Agrave',
  'Aacute',
  'Acirc',
  'Atilde',
  'Auml',
  'Aring',
  'AElig',
  'Ccedil',
  'Egrave',
  'Eacute',
  'Ecirc',
  'Euml',
  'Igrave',
  'Iacute',
  'Icirc',
  'Iuml',
  'ETH',
  'Ntilde',
  'Ograve',
  'Oacute',
  'Ocirc',
  'Otilde',
  'Ouml',
  'times',
  'Oslash',
  'Ugrave',
  'Uacute',
  'Ucirc',
  'Uuml',
  'Yacute',
  'THORN',
  'szlig',
  'agrave',
  'aacute',
  'acirc',
  'atilde',
  'auml',
  'aring',
  'aelig',
  'ccedil',
  'egrave',
  'eacute',
  'ecirc',
  'euml',
  'igrave',
  'iacute',
  'icirc',
  'iuml',
  'eth',
  'ntilde',
  'ograve',
  'oacute',
  'ocirc',
  'otilde',
  'ouml',
  'divide',
  'oslash',
  'ugrave',
  'uacute',
  'ucirc',
  'uuml',
  'yacute',
  'thorn',
  'yuml',
];

const EXTRA: readonly (readonly [string, number])[] = [
  ['OElig', 338],
  ['oelig', 339],
  ['Scaron', 352],
  ['scaron', 353],
  ['Yuml', 376],
  ['fnof', 402],
  ['circ', 710],
  ['tilde', 732],
  ['Alpha', 913],
  ['Beta', 914],
  ['Gamma', 915],
  ['Delta', 916],
  ['Theta', 920],
  ['Lambda', 923],
  ['Pi', 928],
  ['Sigma', 931],
  ['Phi', 934],
  ['Omega', 937],
  ['alpha', 945],
  ['beta', 946],
  ['gamma', 947],
  ['delta', 948],
  ['epsilon', 949],
  ['theta', 952],
  ['lambda', 955],
  ['mu', 956],
  ['pi', 960],
  ['sigma', 963],
  ['tau', 964],
  ['phi', 966],
  ['omega', 969],
  ['ensp', 8194],
  ['emsp', 8195],
  ['thinsp', 8201],
  ['zwnj', 8204],
  ['zwj', 8205],
  ['lrm', 8206],
  ['rlm', 8207],
  ['ndash', 8211],
  ['mdash', 8212],
  ['lsquo', 8216],
  ['rsquo', 8217],
  ['sbquo', 8218],
  ['ldquo', 8220],
  ['rdquo', 8221],
  ['bdquo', 8222],
  ['dagger', 8224],
  ['Dagger', 8225],
  ['bull', 8226],
  ['hellip', 8230],
  ['permil', 8240],
  ['prime', 8242],
  ['Prime', 8243],
  ['lsaquo', 8249],
  ['rsaquo', 8250],
  ['oline', 8254],
  ['frasl', 8260],
  ['euro', 8364],
  ['trade', 8482],
  ['larr', 8592],
  ['uarr', 8593],
  ['rarr', 8594],
  ['darr', 8595],
  ['harr', 8596],
  ['forall', 8704],
  ['part', 8706],
  ['exist', 8707],
  ['empty', 8709],
  ['nabla', 8711],
  ['isin', 8712],
  ['sum', 8721],
  ['minus', 8722],
  ['radic', 8730],
  ['infin', 8734],
  ['and', 8743],
  ['or', 8744],
  ['cap', 8745],
  ['cup', 8746],
  ['int', 8747],
  ['asymp', 8776],
  ['ne', 8800],
  ['equiv', 8801],
  ['le', 8804],
  ['ge', 8805],
  ['loz', 9674],
  ['spades', 9824],
  ['clubs', 9827],
  ['hearts', 9829],
  ['diams', 9830],
];

const BASIC: readonly (readonly [string, number])[] = [
  ['quot', 34],
  ['amp', 38],
  ['apos', 39],
  ['lt', 60],
  ['gt', 62],
];

const LEGACY_ALIASES: readonly (readonly [string, number])[] = [
  ['QUOT', 34],
  ['AMP', 38],
  ['LT', 60],
  ['GT', 62],
  ['COPY', 169],
  ['REG', 174],
];

export const htmlEntityTable: ReadonlyMap<string, number> = new Map([
  ...BASIC,
  ...LEGACY_ALIASES,
  ...LATIN1.map((name, index) => [name, 160 + index] as const),
  ...EXTRA,
]);

const LEGACY_NAMES: readonly string[] = [
  ...BASIC.filter(([name]) => name !== 'apos').map(([name]) => name),
  ...LEGACY_ALIASES.map(([name]) => name),
  ...LATIN1,
].sort((a, b) => b.length - a.length);

const namesByCodePoint: ReadonlyMap<number, string> = new Map(
  [
    ...BASIC.filter(([name]) => name !== 'apos'),
    ...LATIN1.map((name, index) => [name, 160 + index] as const),
    ...EXTRA,
  ].map(([name, code]) => [code, name] as const),
);

const MINIMAL = new Set([0x26, 0x3c, 0x3e, 0x22, 0x27]);

function numericEntity(code: number, format: HtmlEncodeFormat): string {
  return format === 'hex' ? `&#x${code.toString(16).toUpperCase()};` : `&#${code};`;
}

function encodeCodePoint(code: number, format: HtmlEncodeFormat): string {
  if (format === 'named') {
    const name = namesByCodePoint.get(code);
    if (name) return `&${name};`;
    return numericEntity(code, 'decimal');
  }
  return numericEntity(code, format);
}

export function encodeHtmlEntities(
  text: string,
  { scope = 'minimal', format = 'named' }: HtmlEncodeOptions = {},
): string {
  let output = '';
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (MINIMAL.has(code) || (scope === 'non-ascii' && code > 0x7e)) {
      output += encodeCodePoint(code, format);
    } else {
      output += char;
    }
  }
  return output;
}

const NUMERIC = /^&#(?:([0-9]+)|[xX]([0-9a-fA-F]+))(;?)/;
const NAMED = /^&([A-Za-z][A-Za-z0-9]*);/;
const NAME_PREFIX = /^&([A-Za-z][A-Za-z0-9]*)/;

function validCodePoint(code: number): boolean {
  return code > 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff);
}

export function decodeHtmlEntities(text: string): HtmlDecodeResult {
  const issues: HtmlEntityIssue[] = [];
  let output = '';
  let decoded = 0;
  let index = 0;
  while (index < text.length) {
    const amp = text.indexOf('&', index);
    if (amp === -1) {
      output += text.slice(index);
      break;
    }
    output += text.slice(index, amp);
    const rest = text.slice(amp, amp + 40);
    const numeric = NUMERIC.exec(rest);
    if (numeric) {
      const [entity, decimal, hex, semicolon] = numeric;
      const code = decimal !== undefined ? Number(decimal) : parseInt(hex ?? '', 16);
      if (!semicolon) issues.push({ code: 'missing-semicolon', entity, offset: amp });
      if (validCodePoint(code)) {
        output += String.fromCodePoint(code);
      } else {
        output += '�';
        issues.push({ code: 'invalid-code-point', entity, offset: amp });
      }
      decoded++;
      index = amp + entity.length;
      continue;
    }
    const named = NAMED.exec(rest);
    const namedCode = named ? htmlEntityTable.get(named[1] ?? '') : undefined;
    if (named && namedCode !== undefined) {
      output += String.fromCodePoint(namedCode);
      decoded++;
      index = amp + named[0].length;
      continue;
    }
    const prefix = NAME_PREFIX.exec(rest);
    const legacy = prefix ? LEGACY_NAMES.find((name) => prefix[1]?.startsWith(name)) : undefined;
    if (legacy) {
      output += String.fromCodePoint(htmlEntityTable.get(legacy) ?? 0xfffd);
      issues.push({ code: 'missing-semicolon', entity: `&${legacy}`, offset: amp });
      decoded++;
      index = amp + legacy.length + 1;
      continue;
    }
    if (named) issues.push({ code: 'unknown-entity', entity: named[0], offset: amp });
    output += '&';
    index = amp + 1;
  }
  return { output, decoded, issues };
}

export function isHtmlEncodeScope(value: unknown): value is HtmlEncodeScope {
  return typeof value === 'string' && (htmlEncodeScopes as readonly string[]).includes(value);
}

export function isHtmlEncodeFormat(value: unknown): value is HtmlEncodeFormat {
  return typeof value === 'string' && (htmlEncodeFormats as readonly string[]).includes(value);
}

const KNOWN_ENTITY = /&(?:#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6}|[A-Za-z][A-Za-z0-9]{1,31});/g;

export function countKnownEntities(text: string): number {
  let count = 0;
  for (const match of text.matchAll(KNOWN_ENTITY)) {
    const entity = match[0];
    if (entity.startsWith('&#') || htmlEntityTable.has(entity.slice(1, -1))) count++;
  }
  return count;
}
