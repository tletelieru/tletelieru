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

export const detectors: Detector[] = [
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
];

export const largeDetectors: Detector[] = [detectJson, detectHtml];
