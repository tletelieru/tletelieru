import { describe, expect, it } from 'vitest';
import { dedupeValues, parseValues, splitValues, stripSurroundingQuotes } from './values';

describe('splitValues', () => {
  it('splits on newlines, commas, tabs and semicolons by default', () => {
    expect(splitValues('a\nb,c\td;e')).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('handles CRLF and lone CR line endings', () => {
    expect(splitValues('a\r\nb\rc', 'newline')).toEqual(['a', 'b', 'c']);
  });

  it('keeps commas when splitting on newlines only', () => {
    expect(splitValues('a, b\nc;d', 'newline')).toEqual(['a, b', 'c;d']);
  });

  it('trims and skips blanks', () => {
    expect(splitValues('  a  \n\n   \n,, b ')).toEqual(['a', 'b']);
  });

  it('returns nothing for empty input', () => {
    expect(splitValues('')).toEqual([]);
    expect(splitValues(' \n \r\n ')).toEqual([]);
  });
});

describe('stripSurroundingQuotes', () => {
  it.each([
    ["'a'", 'a'],
    ['"a"', 'a'],
    ['`a`', 'a'],
    ["'O''Brien'", "O'Brien"],
    ['\'a"', '\'a"'],
    ["'", "'"],
    ['plain', 'plain'],
    ["O'Brien", "O'Brien"],
  ])('strips %s to %s', (input, expected) => {
    expect(stripSurroundingQuotes(input)).toBe(expected);
  });
});

describe('dedupeValues', () => {
  it('keeps the first occurrence order', () => {
    expect(dedupeValues(['b', 'a', 'b', 'c', 'a'])).toEqual({
      values: ['b', 'a', 'c'],
      stats: { total: 5, unique: 3, duplicatesRemoved: 2 },
    });
  });

  it('keeps duplicates when disabled but still counts unique values', () => {
    expect(dedupeValues(['a', 'a'], false)).toEqual({
      values: ['a', 'a'],
      stats: { total: 2, unique: 1, duplicatesRemoved: 0 },
    });
  });

  it('supports a custom key', () => {
    expect(dedupeValues(['1', '1.0', '2'], true, (value) => String(Number(value))).values).toEqual([
      '1',
      '2',
    ]);
  });
});

describe('parseValues', () => {
  it('parses, dedupes and reports stats', () => {
    expect(parseValues('a\r\nb\r\na\r\n')).toEqual({
      values: ['a', 'b'],
      stats: { total: 3, unique: 2, duplicatesRemoved: 1 },
    });
  });

  it('strips quotes before deduping and drops empty quoted values', () => {
    expect(parseValues("'a'\na\n''", { stripQuotes: true }).values).toEqual(['a']);
  });

  it('keeps unicode values intact', () => {
    expect(parseValues('ñandú\n日本\n😀').values).toEqual(['ñandú', '日本', '😀']);
  });
});
