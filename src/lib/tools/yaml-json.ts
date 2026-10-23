import { parseAllDocuments, stringify, YAMLError } from 'yaml';
import { buildExcerpt, parseJsonValue, type JsonError } from './json';

export type YamlJsonMode = 'yaml2json' | 'json2yaml';
export type YamlIndent = '2' | '4';

export const yamlJsonModes: readonly YamlJsonMode[] = ['yaml2json', 'json2yaml'];
export const yamlIndents: readonly YamlIndent[] = ['2', '4'];

export interface YamlError {
  code: string;
  message: string;
  line: number | null;
  column: number | null;
  excerpt: string;
}

export type YamlJsonError = { code: 'yaml'; error: YamlError } | { code: 'json'; error: JsonError };

export type YamlJsonResult =
  { ok: true; output: string; documents: number } | { ok: false; error: YamlJsonError };

export interface YamlJsonOptions {
  indent: YamlIndent;
}

const MAX_ALIASES = 100;

function describeYamlError(error: YAMLError, source: string): YamlError {
  const [reason] = error.message.split(/ at line \d+, column \d+/);
  const start = error.linePos?.[0];
  return {
    code: error.code,
    message: (reason ?? error.message).trim(),
    line: start?.line ?? null,
    column: start?.col ?? null,
    excerpt: start ? buildExcerpt(source, error.pos[0]) : '',
  };
}

export function yamlToJson(
  input: string,
  { indent = '2' }: Partial<YamlJsonOptions> = {},
): YamlJsonResult {
  if (!input.trim()) return { ok: true, output: '', documents: 0 };
  try {
    const documents = parseAllDocuments(input, { prettyErrors: true });
    const list = Array.isArray(documents) ? documents : [];
    for (const document of list) {
      const [first] = document.errors;
      if (first)
        return { ok: false, error: { code: 'yaml', error: describeYamlError(first, input) } };
    }
    const values = list.map((document) => document.toJS({ maxAliasCount: MAX_ALIASES }) as unknown);
    const value = values.length === 1 ? values[0] : values;
    return {
      ok: true,
      output: JSON.stringify(value ?? null, null, Number(indent)),
      documents: list.length,
    };
  } catch (error) {
    if (error instanceof YAMLError) {
      return { ok: false, error: { code: 'yaml', error: describeYamlError(error, input) } };
    }
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: {
        code: 'yaml',
        error: { code: 'UNKNOWN', message, line: null, column: null, excerpt: '' },
      },
    };
  }
}

export function jsonToYaml(
  input: string,
  { indent = '2' }: Partial<YamlJsonOptions> = {},
): YamlJsonResult {
  if (!input.trim()) return { ok: true, output: '', documents: 0 };
  const parsed = parseJsonValue(input);
  if (!parsed.ok) return { ok: false, error: { code: 'json', error: parsed.error } };
  return {
    ok: true,
    output: stringify(parsed.value, { indent: Number(indent), aliasDuplicateObjects: false }),
    documents: 1,
  };
}

export function convertYamlJson(
  input: string,
  mode: YamlJsonMode,
  options: Partial<YamlJsonOptions> = {},
): YamlJsonResult {
  return mode === 'yaml2json' ? yamlToJson(input, options) : jsonToYaml(input, options);
}
