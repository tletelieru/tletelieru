import { describe, expect, it } from 'vitest';
import {
  compileRegex,
  describeMatches,
  highlightSegments,
  isRiskyPattern,
  normalizeFlags,
  runRegex,
} from './regex';

describe('runRegex', () => {
  it('lists matches with numbered and named groups', () => {
    const result = runRegex('(?<year>\\d{4})-(\\d{2})', 'on 2024-01 and 2025-12', { flags: 'g' });
    expect(result).toMatchObject({
      ok: true,
      run: {
        matches: [
          {
            index: 3,
            end: 10,
            text: '2024-01',
            groups: [
              { index: 1, value: '2024' },
              { index: 2, value: '01' },
            ],
            named: [{ name: 'year', value: '2024' }],
          },
          { index: 15, text: '2025-12' },
        ],
        truncated: false,
        timedOut: false,
      },
    });
  });

  it('returns only the first match without the g flag', () => {
    const result = runRegex('a', 'aaa', { flags: '' });
    expect(result.ok && result.run.matches).toHaveLength(1);
  });

  it('builds a replace preview', () => {
    const result = runRegex('(?<y>\\d{4})-(\\d{2})', '2024-01', {
      flags: 'g',
      replacement: '$2/$<y>',
    });
    expect(result.ok && result.run.replaced).toBe('01/2024');
  });

  it('advances past empty matches', () => {
    const result = runRegex('x*', 'ab', { flags: 'g' });
    expect(result.ok && result.run.matches.map((match) => match.index)).toEqual([0, 1, 2]);
  });

  it('caps the number of matches', () => {
    const result = runRegex('a', 'aaaa', { flags: 'g', maxMatches: 2 });
    expect(result).toMatchObject({ ok: true, run: { truncated: true } });
    expect(result.ok && result.run.matches).toHaveLength(2);
  });

  it('stops when the time budget runs out', () => {
    let tick = 0;
    const result = runRegex('a', 'aaaa', { flags: 'g', timeBudgetMs: 1, clock: () => tick++ * 5 });
    expect(result).toMatchObject({ ok: true, run: { timedOut: true, replaced: null } });
  });

  it('reports invalid patterns and empty input', () => {
    expect(runRegex('[', 'x')).toMatchObject({ ok: false, error: { code: 'invalidPattern' } });
    expect(runRegex('', 'x')).toEqual({ ok: false, error: { code: 'patternRequired' } });
  });

  it('refuses risky patterns unless allowed', () => {
    expect(runRegex('(a+)+$', 'aaaa')).toEqual({ ok: false, error: { code: 'risky' } });
    expect(runRegex('(a+)+$', 'aaaa', { allowRisky: true }).ok).toBe(true);
  });
});

describe('helpers', () => {
  it.each([
    ['(a+)+', true],
    ['(\\w*)*', true],
    ['(a{1,})+', true],
    ['(a|b)+', false],
    ['\\d+-\\d+', false],
  ])('isRiskyPattern(%j)', (pattern, expected) => {
    expect(isRiskyPattern(pattern)).toBe(expected);
  });

  it('normalizes flags', () => {
    expect(normalizeFlags('igxg')).toBe('gi');
  });

  it('compiles with flags', () => {
    const result = compileRegex('a', 'gi');
    expect(result.ok && result.regex.flags).toBe('gi');
  });

  it('splits text into highlight segments', () => {
    const result = runRegex('b+', 'abbcb', { flags: 'g' });
    expect(result.ok && highlightSegments('abbcb', result.run.matches)).toEqual([
      { text: 'a', match: null },
      { text: 'bb', match: 0 },
      { text: 'c', match: null },
      { text: 'b', match: 1 },
    ]);
  });

  it('describes matches', () => {
    const result = runRegex('(?<k>a)(b)?', 'a', { flags: 'g' });
    expect(result.ok && describeMatches(result.run.matches)).toBe(
      '#1 [0–1] "a"\n  $1 = "a"\n  $2 = undefined\n  $<k> = "a"',
    );
  });
});
