import { describe, expect, it } from 'vitest';
import { formatTagInput, isDraftValid, parseTagInput, validateDraft } from './draft';

describe('draft helpers', () => {
  it('parses comma-separated tags', () => {
    expect(parseTagInput(' SQL, json ,, sql ')).toEqual(['sql', 'json']);
    expect(parseTagInput('')).toEqual([]);
    expect(formatTagInput(['sql', 'json'])).toBe('sql, json');
  });

  it('requires title and content', () => {
    expect(validateDraft({ title: ' ', content: '', tags: [] })).toEqual({
      title: true,
      content: true,
    });
    expect(isDraftValid({ title: 'a', content: ' ', tags: [] })).toBe(false);
    expect(isDraftValid({ title: 'a', content: 'b', tags: [] })).toBe(true);
  });
});
