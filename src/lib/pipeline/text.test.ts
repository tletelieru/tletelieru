import { describe, expect, it } from 'vitest';
import { naturalCompare, splitLines, unescapeSeparator } from './text';

describe('naturalCompare', () => {
  it('orders numbers by value and text case-insensitively', () => {
    const items = ['file10', 'file2', 'File1', 'file02', 'a', 'B', '10', '9'];
    expect([...items].sort(naturalCompare)).toEqual([
      '9',
      '10',
      'a',
      'B',
      'File1',
      'file02',
      'file2',
      'file10',
    ]);
  });

  it('handles very long digit runs without precision loss', () => {
    expect(naturalCompare('x12345678901234567891', 'x12345678901234567890')).toBeGreaterThan(0);
  });
});

describe('splitLines', () => {
  it('splits on any newline style', () => {
    expect(splitLines('a\r\nb\rc\nd')).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('unescapeSeparator', () => {
  it('expands \\n, \\t and \\\\', () => {
    expect(unescapeSeparator('\\n\\t\\\\x')).toBe('\n\t\\x');
  });
});
