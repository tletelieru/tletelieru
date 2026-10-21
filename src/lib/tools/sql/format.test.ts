import { describe, expect, it } from 'vitest';
import {
  batchedInClause,
  chunk,
  columnError,
  combineClauses,
  inClause,
  isValidIdentifier,
  keyword,
  previewValues,
  pickOption,
  quoteStyles,
  quoteValue,
  resolveSqlOptions,
  sqlOptionDefaults,
  wrapList,
} from './format';

describe('quoteValue', () => {
  it.each([
    ['single', "O'Brien", "'O''Brien'"],
    ['double', 'say "hi"', '"say ""hi"""'],
    ['backtick', 'a`b', '`a``b`'],
    ['none', "O'Brien", "O'Brien"],
  ] as const)('quotes with %s', (quote, value, expected) => {
    expect(quoteValue(value, { quote })).toBe(expected);
  });

  it('does not escape when disabled', () => {
    expect(quoteValue("O'Brien", { escape: false })).toBe("'O'Brien'");
  });

  it('only escapes the active quote character', () => {
    expect(quoteValue(`it's "x"`, { quote: 'double' })).toBe(`"it's ""x"""`);
  });
});

describe('keyword', () => {
  it('switches case', () => {
    expect(keyword('NOT IN')).toBe('NOT IN');
    expect(keyword('NOT IN', false)).toBe('not in');
  });
});

describe('chunk', () => {
  it('returns one batch when size is 0', () => {
    expect(chunk([1, 2, 3], 0)).toEqual([[1, 2, 3]]);
  });

  it('splits at exact boundaries', () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it('keeps the remainder in the last batch', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('returns no batches for no items', () => {
    expect(chunk([], 3)).toEqual([]);
  });
});

describe('wrapList', () => {
  it('formats on a single line', () => {
    expect(wrapList(['a', 'b'], '(', ')')).toBe('(a, b)');
  });

  it('formats one per line', () => {
    expect(wrapList(['a', 'b'], '(', ')', 'multi')).toBe('(\n  a,\n  b\n)');
  });
});

describe('inClause', () => {
  it('builds a bare IN', () => {
    expect(inClause(["'a'"])).toBe("IN ('a')");
  });

  it('adds column, NOT and lowercase keywords', () => {
    expect(inClause(['1', '2'], { column: 'id', not: true, uppercase: false })).toBe(
      'id not in (1, 2)',
    );
  });
});

describe('combineClauses', () => {
  it('returns a single clause untouched', () => {
    expect(combineClauses(['a'], { joiner: 'OR' })).toBe('a');
  });

  it('joins with blank lines without a joiner', () => {
    expect(combineClauses(['a', 'b'], { joiner: null })).toBe('a\n\nb');
  });

  it('wraps joined clauses in parentheses', () => {
    expect(combineClauses(['a', 'b'], { joiner: 'OR' })).toBe('(a OR b)');
    expect(combineClauses(['a', 'b'], { joiner: 'AND', wrap: false })).toBe('a AND b');
  });

  it('indents multi-line clauses', () => {
    expect(combineClauses(['a', 'b'], { joiner: 'OR', layout: 'multi' })).toBe('(\n  a\n  OR b\n)');
  });
});

describe('batchedInClause', () => {
  it('returns empty string for no items', () => {
    expect(batchedInClause([])).toBe('');
  });

  it('separates batches by blank lines without a column', () => {
    expect(batchedInClause(['1', '2', '3'], { batchSize: 2 })).toBe('IN (1, 2)\n\nIN (3)');
  });

  it('joins batches with OR when a column is given', () => {
    expect(batchedInClause(['1', '2', '3'], { batchSize: 2, column: 'id' })).toBe(
      '(id IN (1, 2) OR id IN (3))',
    );
  });

  it('joins NOT IN batches with AND', () => {
    expect(batchedInClause(['1', '2'], { batchSize: 1, column: 'id', not: true })).toBe(
      '(id NOT IN (1) AND id NOT IN (2))',
    );
  });

  it('does not split when the batch size equals the item count', () => {
    expect(batchedInClause(['1', '2'], { batchSize: 2, column: 'id' })).toBe('id IN (1, 2)');
  });
});

describe('identifiers', () => {
  it.each(['id', 'user_id', 't.col', 'public.users.id', '"Weird Name"', '`order`', 'año', '_x$1'])(
    'accepts %s',
    (name) => {
      expect(isValidIdentifier(name)).toBe(true);
    },
  );

  it.each(['1abc', 'a b', 'a;drop', "a'", 'a.', '.a', '""'])('rejects %s', (name) => {
    expect(isValidIdentifier(name)).toBe(false);
  });

  it('reports column errors', () => {
    expect(columnError('')).toBeNull();
    expect(columnError('', true)).toEqual({ code: 'columnRequired' });
    expect(columnError('a b')).toEqual({ code: 'invalidColumn', column: 'a b' });
    expect(columnError(' id ')).toBeNull();
  });
});

describe('previewValues', () => {
  it('caps the listed values', () => {
    expect(previewValues(['a'])).toEqual({ shown: ['a'], hidden: 0 });
    expect(previewValues(['a', 'b', 'c', 'd', 'e', 'f', 'g'])).toEqual({
      shown: ['a', 'b', 'c', 'd', 'e'],
      hidden: 2,
    });
  });
});

describe('options', () => {
  it('picks allowed values or falls back', () => {
    expect(pickOption('double', quoteStyles, 'single')).toBe('double');
    expect(pickOption('nope', quoteStyles, 'single')).toBe('single');
  });

  it('resolves URL state into typed options', () => {
    expect(
      resolveSqlOptions({ ...sqlOptionDefaults, sep: 'bad', layout: 'multi', batch: -5.7 }),
    ).toEqual({
      parse: { separator: 'any', dedupe: true, stripQuotes: false },
      quote: 'single',
      escape: true,
      layout: 'multi',
      batchSize: 0,
      uppercase: true,
    });
  });
});
