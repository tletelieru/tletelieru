import { decodeBase64 } from '../pipeline/encoding';
import { countKnownEntities } from '../tools/html-entities';
import { unescapeJsonString } from '../tools/json-escape';
import { validateCnpj } from '../tools/cnpj';
import { validateCpf } from '../tools/cpf';
import { validateCuit } from '../tools/ids/argentina';
import { validateCurp } from '../tools/ids/mexico';
import { validateEsDni, validateNie } from '../tools/ids/spain';
import { parseJson } from '../tools/json';
import { parseRut, validateRut } from '../tools/rut';
import { parseDateTime } from '../tools/time/parse';
import { parseTimestamp } from '../tools/unix';

export interface Detection {
  slug: string;
  confidence: number;
  params: Record<string, string>;
  sensitive?: boolean;
}

export interface DetectContext {
  text: string;
  trimmed: string;
  lines: string[];
  values: string[];
  large: boolean;
}

export type Detector = (context: DetectContext) => Detection[];

export const MAX_LINES = 2000;

function lineScore(lines: readonly string[], score: (line: string) => number): number {
  if (lines.length === 0) return 0;
  let total = 0;
  for (const line of lines) {
    const value = score(line);
    if (value <= 0) return 0;
    total += value;
  }
  return total / lines.length;
}

function result(slug: string, confidence: number, params: Record<string, string>): Detection[] {
  return confidence > 0 ? [{ slug, confidence: Math.min(1, confidence), params }] : [];
}

const RUT_SEPARATORS = /[-.]|k$/i;

export const detectRut: Detector = ({ text, lines }) => {
  const score = lineScore(lines, (line) => {
    if (!parseRut(line)) return 0;
    const strong = RUT_SEPARATORS.test(line);
    const valid = validateRut(line).valid;
    if (valid) return strong ? 0.95 : 0.5;
    return strong ? 0.3 : 0;
  });
  return result('rut', score, { input: text, mode: 'validate' });
};

const FORMATTED_CPF = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

export const detectCpf: Detector = ({ text, lines }) => {
  const score = lineScore(lines, (line) => {
    const check = validateCpf(line);
    const formatted = FORMATTED_CPF.test(line);
    if (check.valid) return formatted ? 0.95 : 0.75;
    if (check.reason === 'format') return 0;
    return formatted ? 0.4 : 0;
  });
  return result('cpf', score, { input: text, mode: 'validate' });
};

const FORMATTED_CNPJ = /^[0-9A-Z]{2}\.[0-9A-Z]{3}\.[0-9A-Z]{3}\/[0-9A-Z]{4}-\d{2}$/i;

export const detectCnpj: Detector = ({ text, lines }) => {
  const score = lineScore(lines, (line) => {
    const check = validateCnpj(line);
    const formatted = FORMATTED_CNPJ.test(line);
    if (check.valid) return formatted ? 0.95 : 0.8;
    if (check.reason === 'format') return 0;
    return formatted ? 0.4 : 0;
  });
  return result('cnpj', score, { input: text, mode: 'validate' });
};

interface NationalDoc {
  country: string;
  doc: string;
  shape: RegExp;
  validate: (input: string) => { valid: boolean };
  invalidScore: number;
}

const nationalDocs: NationalDoc[] = [
  {
    country: 'ar',
    doc: 'ar-cuit',
    shape: /^\d{2}-\d{8}-\d$/,
    validate: validateCuit,
    invalidScore: 0.35,
  },
  {
    country: 'mx',
    doc: 'mx-curp',
    shape: /^[A-Z]{4}\d{6}[A-Z0-9]{8}$/i,
    validate: validateCurp,
    invalidScore: 0.4,
  },
  {
    country: 'es',
    doc: 'es-dni',
    shape: /^\d{8}-?[A-Z]$/i,
    validate: validateEsDni,
    invalidScore: 0,
  },
  {
    country: 'es',
    doc: 'es-nie',
    shape: /^[XYZ]-?\d{7}-?[A-Z]$/i,
    validate: validateNie,
    invalidScore: 0,
  },
];

export const detectNationalId: Detector = ({ text, lines }) => {
  for (const doc of nationalDocs) {
    const score = lineScore(lines, (line) => {
      if (!doc.shape.test(line)) return 0;
      return doc.validate(line).valid ? 0.9 : doc.invalidScore;
    });
    if (score > 0) {
      return result('national-id', score, {
        input: text,
        mode: 'validate',
        country: doc.country,
        doc: doc.doc,
      });
    }
  }
  return [];
};

function looksLikeJsonContainer(trimmed: string): boolean {
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  return (first === '{' && last === '}') || (first === '[' && last === ']');
}

export const detectJson: Detector = ({ text, trimmed, large }) => {
  if (!looksLikeJsonContainer(trimmed)) return [];
  if (large) return result('json', 0.6, { input: text });
  const parsed = parseJson(trimmed);
  if (parsed.ok) return result('json', 0.95, { input: text });
  return result('json', 0.5, { input: text, mode: 'validate' });
};

const TAG = /<\/?[a-z][a-z0-9-]*(?:\s[^<>]*)?\/?>/i;
const CLOSING = /<\/[a-z][a-z0-9-]*\s*>|<!doctype html/i;

export const detectHtml: Detector = ({ text, trimmed }) => {
  if (!trimmed.startsWith('<')) return [];
  const head = trimmed.slice(0, 4000);
  if (!TAG.test(head) && !/^<!doctype html/i.test(head)) return [];
  const closed = CLOSING.test(head) || CLOSING.test(trimmed.slice(-4000));
  return result('html', closed ? 0.9 : 0.6, { input: text });
};

const TIMESTAMP = /^-?(?:\d{10}|\d{13})(?:\.\d+)?$/;

export const detectUnix: Detector = ({ text, values }) => {
  if (values.length === 0) return [];
  const all = values.every((value) => TIMESTAMP.test(value) && parseTimestamp(value) !== null);
  if (all) return result('unix', values.length === 1 ? 0.9 : 0.85, { input: text });
  return [];
};

const HAS_TIME = /\d{2}:\d{2}/;

export const detectDateTime: Detector = ({ lines }) => {
  if (lines.length !== 1) return [];
  const [line] = lines;
  if (!/^[+-]?\d{4}/.test(line) || !parseDateTime(line)) return [];
  const withTime = HAS_TIME.test(line);
  return [
    ...result('timezone', withTime ? 0.85 : 0.5, { input: line }),
    ...result('unix', withTime ? 0.6 : 0.45, { input: line }),
  ];
};

const INTEGER = /^-?\d+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLAIN_VALUE = /^[\p{L}\p{N}_.@:+#/-]{1,120}$/u;

export const detectLists: Detector = ({ text, lines, values }) => {
  if (values.length < 2 || (lines.length < 2 && values.length < 3)) return [];
  if (values.every((value) => INTEGER.test(value))) {
    return [
      ...result('sql-in-numbers', 0.6, { input: text }),
      ...result('sql-in-text', 0.3, { input: text }),
    ];
  }
  if (values.every((value) => UUID.test(value))) {
    return result('sql-in-text', 0.65, { input: text });
  }
  if (values.every((value) => PLAIN_VALUE.test(value))) {
    return result('sql-in-text', 0.4, { input: text });
  }
  return [];
};

const SEPARATED = /^[A-Za-z][A-Za-z0-9]*(?:[_-][A-Za-z][A-Za-z0-9]*)+$/;
const CAMEL = /^[a-z][a-z0-9]*(?:[A-Z][a-z0-9]*)+$/;
const PASCAL = /^[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]*)+$/;

export function isIdentifier(value: string): boolean {
  return SEPARATED.test(value) || CAMEL.test(value) || PASCAL.test(value);
}

export const detectCase: Detector = ({ text, lines }) => {
  if (lines.length === 0 || !lines.every(isIdentifier)) return [];
  return result('case', lines.length === 1 ? 0.7 : 0.5, { input: text });
};

const JWT_SHAPE = /^(?:Bearer\s+)?([A-Za-z0-9_-]{2,}\.[A-Za-z0-9_-]{2,}\.[A-Za-z0-9_-]*)$/;

function decodeJsonSegment(segment: string): unknown {
  const decoded = decodeBase64(segment);
  if (!decoded.ok) return null;
  try {
    return JSON.parse(decoded.text);
  } catch {
    return null;
  }
}

export const detectJwt: Detector = ({ lines }) => {
  if (lines.length !== 1) return [];
  const token = JWT_SHAPE.exec(lines[0] ?? '')?.[1];
  if (!token) return [];
  const header = decodeJsonSegment(token.split('.')[0] ?? '');
  if (typeof header !== 'object' || header === null || Array.isArray(header)) return [];
  if (typeof (header as Record<string, unknown>).alg !== 'string') return [];
  return [{ slug: 'jwt', confidence: 0.97, params: { input: token }, sensitive: true }];
};

const UUID_LIKE =
  /^(?:urn:uuid:)?\{?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}?$/i;
const ULID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i;

function isUlid(value: string): boolean {
  return ULID.test(value) && /\d/.test(value.slice(1)) && /[A-Z]/i.test(value);
}

export const detectUuid: Detector = ({ text, lines, values }) => {
  const items = lines.length === 1 ? values : lines;
  if (items.length === 0) return [];
  if (!items.every((item) => UUID_LIKE.test(item) || isUlid(item))) return [];
  return result('uuid', items.length === 1 ? 0.9 : 0.75, { mode: 'inspect', input: text });
};

const BASE64_STANDARD = /^[A-Za-z0-9+/]+={0,2}$/;
const BASE64_URL = /^[A-Za-z0-9_-]+={0,2}$/;
const HEX_ONLY = /^[0-9a-f]+$/i;
const WINDOWS_PATH = /^[A-Za-z]:\\/;

function printableRatio(text: string): number {
  if (!text) return 0;
  let printable = 0;
  let total = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    total++;
    if (code === 0xfffd) return 0;
    if (code === 0x09 || code === 0x0a || code === 0x0d || (code >= 0x20 && code !== 0x7f)) {
      printable++;
    }
  }
  return printable / total;
}

function sameWidth(lines: readonly string[]): boolean {
  if (lines.length < 2) return true;
  const width = lines[0]?.length ?? 0;
  return (
    lines.slice(0, -1).every((line) => line.length === width) &&
    (lines.at(-1)?.length ?? 0) <= width
  );
}

export const detectBase64: Detector = ({ text, trimmed, lines }) => {
  if (lines.length === 0 || lines.length > 500 || !sameWidth(lines)) return [];
  const joined = lines.join('');
  if (joined.length < 16 || joined.length % 4 === 1) return [];
  if (!BASE64_STANDARD.test(joined) && !BASE64_URL.test(joined)) return [];
  if (HEX_ONLY.test(joined) || UUID_LIKE.test(trimmed)) return [];
  if (!/[a-z]/.test(joined) || !/[A-Z]/.test(joined) || !/[0-9+/=]/.test(joined)) return [];
  const padded = joined.endsWith('=');
  if (padded && joined.length % 4 !== 0) return [];
  const decoded = decodeBase64(joined);
  if (!decoded.ok || !decoded.text.trim() || printableRatio(decoded.text) < 0.95) return [];
  const body = decoded.text.trim();
  const json = looksLikeJsonContainer(body) && parseJson(body).ok;
  const strong = padded || /[+/]/.test(joined);
  return result('base64', json ? 0.85 : strong ? 0.75 : 0.6, { mode: 'decode', input: text });
};

const QUERY_PAIR = String.raw`[\w.~%+\-\[\]]+=[^&\s#]*`;
const QUERY_STRING = new RegExp(
  String.raw`^(?:\?${QUERY_PAIR}(?:&${QUERY_PAIR})*|${QUERY_PAIR}(?:&${QUERY_PAIR})+)$`,
);

function isHttpUrl(value: string): boolean {
  if (!/^https?:\/\/\S+$/i.test(value)) return false;
  try {
    return new URL(value).hostname !== '';
  } catch {
    return false;
  }
}

export const detectUrl: Detector = ({ lines }) => {
  if (lines.length !== 1) return [];
  const [line = ''] = lines;
  if (isHttpUrl(line)) return result('url', 0.9, { mode: 'parse', input: line });
  if (QUERY_STRING.test(line)) return result('url', 0.7, { mode: 'parse', input: line });
  return [];
};

export const detectHtmlEntities: Detector = ({ text, trimmed }) => {
  const count = countKnownEntities(trimmed.slice(0, 20000));
  if (count === 0) return [];
  return result('html-entities', count > 1 ? 0.8 : 0.7, { mode: 'decode', input: text });
};

const JSON_ESCAPE = /\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4})/;
const STRONG_ESCAPE = /\\(?:"|u[0-9a-fA-F]{4})/;

export const detectJsonEscape: Detector = ({ text, trimmed }) => {
  if (!JSON_ESCAPE.test(trimmed) || WINDOWS_PATH.test(trimmed)) return [];
  if (looksLikeJsonContainer(trimmed) && parseJson(trimmed).ok) return [];
  const unescaped = unescapeJsonString(trimmed);
  if (!unescaped.ok || unescaped.escapes === 0) return [];
  const confidence = unescaped.quoted ? 0.85 : STRONG_ESCAPE.test(trimmed) ? 0.7 : 0.45;
  return result('json-escape', confidence, { mode: 'unescape', input: text });
};

const HASH = /^(?:[0-9a-f]{32}|[0-9a-f]{40}|[0-9a-f]{64})$/i;

export const detectHash: Detector = ({ lines }) => {
  if (lines.length !== 1 || !HASH.test(lines[0] ?? '')) return [];
  return result('hash', 0.35, { mode: 'verify', expected: lines[0] ?? '' });
};

export const detectors: Detector[] = [
  detectJwt,
  detectRut,
  detectCpf,
  detectCnpj,
  detectNationalId,
  detectJson,
  detectHtml,
  detectUnix,
  detectDateTime,
  detectLists,
  detectCase,
  detectUuid,
  detectBase64,
  detectUrl,
  detectHtmlEntities,
  detectJsonEscape,
  detectHash,
];

export const largeDetectors: Detector[] = [detectJson, detectHtml];
