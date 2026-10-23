import { describe, expect, it } from 'vitest';
import { diffText, splitRows, splitTextLines, unifiedDiff } from './text-diff';

describe('splitTextLines', () => {
  it('handles line endings and a trailing newline', () => {
    expect(splitTextLines('a\r\nb\rc\n')).toEqual(['a', 'b', 'c']);
    expect(splitTextLines('')).toEqual([]);
  });
});

describe('diffText', () => {
  it('counts added and removed lines', () => {
    const result = diffText('a\nb\nc', 'a\nc\nd');
    expect(result).toMatchObject({ added: 1, removed: 1, identical: false });
    expect(result.lines.map((line) => `${line.kind}:${line.text}`)).toEqual([
      'same:a',
      'removed:b',
      'same:c',
      'added:d',
    ]);
  });

  it('ignores whitespace and case when asked', () => {
    expect(diffText('a  b\nC', 'a b \nc').identical).toBe(false);
    expect(
      diffText('a  b\nC', 'a b \nc', { ignoreWhitespace: true, ignoreCase: true }).identical,
    ).toBe(true);
  });

  it('tracks line numbers on both sides', () => {
    const { lines } = diffText('x\ny', 'y');
    expect(lines).toEqual([
      { kind: 'removed', text: 'x', oldLine: 1, newLine: null },
      { kind: 'same', text: 'y', oldLine: 2, newLine: 1 },
    ]);
  });
});

describe('splitRows', () => {
  it('pairs removed and added lines', () => {
    const rows = splitRows(diffText('a\nb', 'a\nc\nd').lines);
    expect(rows.map((row) => [row.left?.text ?? null, row.right?.text ?? null])).toEqual([
      ['a', 'a'],
      ['b', 'c'],
      [null, 'd'],
    ]);
  });
});

describe('unifiedDiff', () => {
  it('renders hunks with context', () => {
    const before = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].join('\n');
    const after = ['1', '2', '3', '4', 'five', '6', '7', '8', '9'].join('\n');
    expect(unifiedDiff(diffText(before, after).lines, { context: 1 })).toBe(
      ['--- original', '+++ changed', '@@ -4,3 +4,3 @@', ' 4', '-5', '+five', ' 6'].join('\n'),
    );
  });

  it('merges nearby hunks and handles additions to empty text', () => {
    expect(unifiedDiff(diffText('', 'a').lines)).toBe(
      '--- original\n+++ changed\n@@ -0,0 +1 @@\n+a',
    );
  });

  it('returns nothing for identical texts', () => {
    expect(unifiedDiff(diffText('a', 'a').lines)).toBe('');
  });
});
