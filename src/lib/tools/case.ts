export const caseIds = [
  'snake',
  'kebab',
  'camel',
  'pascal',
  'constant',
  'title',
  'sentence',
  'dot',
  'path',
  'lower',
  'upper',
] as const;

export type CaseId = (typeof caseIds)[number];

export interface CaseOptions {
  stripAccents?: boolean;
}

export function isCaseId(value: string): value is CaseId {
  return (caseIds as readonly string[]).includes(value);
}

export function removeAccents(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .normalize('NFC');
}

export function splitWords(input: string, { stripAccents = false }: CaseOptions = {}): string[] {
  const text = (stripAccents ? removeAccents(input) : input).normalize('NFC');
  return text
    .replace(/['’]/g, '')
    .replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2')
    .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, '$1 $2')
    .replace(/(\p{N})(\p{Lu}\p{Ll})/gu, '$1 $2')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

function lower(word: string): string {
  return word.toLowerCase();
}

function capitalize(word: string): string {
  const [first = '', ...rest] = Array.from(word);
  return first.toUpperCase() + rest.join('').toLowerCase();
}

function fromWords(words: string[], caseId: CaseId): string {
  switch (caseId) {
    case 'snake':
      return words.map(lower).join('_');
    case 'kebab':
      return words.map(lower).join('-');
    case 'camel':
      return words.map((word, index) => (index ? capitalize(word) : lower(word))).join('');
    case 'pascal':
      return words.map(capitalize).join('');
    case 'constant':
      return words.map((word) => word.toUpperCase()).join('_');
    case 'title':
      return words.map(capitalize).join(' ');
    case 'sentence':
      return words.map((word, index) => (index ? lower(word) : capitalize(word))).join(' ');
    case 'dot':
      return words.map(lower).join('.');
    case 'path':
      return words.map(lower).join('/');
    case 'lower':
      return words.map(lower).join(' ');
    case 'upper':
      return words.map((word) => word.toUpperCase()).join(' ');
  }
}

export function convertCase(input: string, caseId: CaseId, options: CaseOptions = {}): string {
  return fromWords(splitWords(input, options), caseId);
}

export function convertAllCases(
  input: string,
  options: CaseOptions = {},
): { id: CaseId; value: string }[] {
  const words = splitWords(input, options);
  return caseIds.map((id) => ({ id, value: fromWords(words, id) }));
}

export function convertLines(input: string, caseId: CaseId, options: CaseOptions = {}): string {
  return input
    .split(/\r?\n/)
    .map((line) => convertCase(line, caseId, options))
    .join('\n');
}

export function isMultiline(input: string): boolean {
  return input.trim().includes('\n');
}
