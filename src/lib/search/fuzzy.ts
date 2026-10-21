export interface SearchField {
  text: string;
  weight: number;
}

const EXACT = 100;
const PREFIX = 80;
const WORD_EXACT = 70;
const WORD_PREFIX = 60;
const CONTAINS = 40;
const SUBSEQUENCE = 20;
const SUBSEQUENCE_MAX_SPREAD = 4;

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function isBoundary(text: string, index: number): boolean {
  return index === 0 || !/[\p{L}\p{N}]/u.test(text[index - 1]);
}

function subsequenceScore(query: string, text: string): number {
  let best = 0;
  for (
    let start = text.indexOf(query[0]);
    start !== -1;
    start = text.indexOf(query[0], start + 1)
  ) {
    let position = start;
    let matched = 1;
    let boundaries = isBoundary(text, start) ? 1 : 0;
    for (; matched < query.length; matched++) {
      const next = text.indexOf(query[matched], position + 1);
      if (next === -1) break;
      if (isBoundary(text, next)) boundaries++;
      position = next;
    }
    if (matched < query.length) break;
    const span = position - start + 1;
    if (span > query.length * SUBSEQUENCE_MAX_SPREAD) continue;
    const tightness = query.length / span;
    const startBonus = start === 0 ? 8 : isBoundary(text, start) ? 5 : 0;
    const score = SUBSEQUENCE * tightness + startBonus + boundaries;
    if (score > best) best = score;
  }
  return best;
}

function normalizedScore(query: string, text: string): number {
  if (!query || !text) return 0;
  if (text === query) return EXACT;
  if (text.startsWith(query)) return PREFIX;
  let index = text.indexOf(query);
  let contains = false;
  while (index !== -1) {
    contains = true;
    if (isBoundary(text, index)) {
      const end = index + query.length;
      return end === text.length || isBoundary(text, end) ? WORD_EXACT : WORD_PREFIX;
    }
    index = text.indexOf(query, index + 1);
  }
  if (contains) return CONTAINS;
  return query.length >= 2 ? subsequenceScore(query, text) : 0;
}

export function scoreText(query: string, text: string): number {
  return normalizedScore(normalize(query), normalize(text));
}

export function scoreFields(query: string, fields: readonly SearchField[]): number {
  const phrase = normalize(query);
  if (!phrase) return 0;
  const texts = fields.map((field) => ({ text: normalize(field.text), weight: field.weight }));
  const best = (token: string) =>
    texts.reduce(
      (max, field) => Math.max(max, normalizedScore(token, field.text) * field.weight),
      0,
    );
  const phraseScore = best(phrase);
  const tokens = phrase.split(' ');
  if (tokens.length === 1) return phraseScore;
  let tokenScore = 0;
  for (const token of tokens) {
    const score = best(token);
    if (score === 0) return phraseScore;
    tokenScore += score;
  }
  return Math.max(phraseScore * tokens.length, tokenScore);
}

export function rankItems<T>(
  items: readonly T[],
  query: string,
  fields: (item: T) => SearchField[],
  limit = Infinity,
): T[] {
  if (!normalize(query)) return [];
  return items
    .map((item, index) => ({ item, index, score: scoreFields(query, fields(item)) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.item);
}
