import { describe, expect, it } from 'vitest';
import { formatRelativeTime, truncatePreview } from './format';

const now = Date.UTC(2026, 9, 21, 12);

describe('formatRelativeTime', () => {
  it('picks a sensible unit', () => {
    expect(formatRelativeTime(now - 3_000, now, 'en')).toBe('now');
    expect(formatRelativeTime(now - 30_000, now, 'en')).toBe('30 seconds ago');
    expect(formatRelativeTime(now - 5 * 60_000, now, 'en')).toBe('5 minutes ago');
    expect(formatRelativeTime(now - 2 * 3_600_000, now, 'en')).toBe('2 hours ago');
    expect(formatRelativeTime(now - 86_400_000, now, 'en')).toBe('yesterday');
    expect(formatRelativeTime(now - 14 * 86_400_000, now, 'en')).toBe('2 weeks ago');
  });

  it('formats in Spanish', () => {
    expect(formatRelativeTime(now - 5 * 60_000, now, 'es')).toBe('hace 5 minutos');
  });
});

describe('truncatePreview', () => {
  it('flattens whitespace and truncates', () => {
    expect(truncatePreview('a\n  b\tc')).toBe('a b c');
    expect(truncatePreview('abcdefghij', 5)).toBe('abcd…');
    expect(truncatePreview('abcde', 5)).toBe('abcde');
  });
});
