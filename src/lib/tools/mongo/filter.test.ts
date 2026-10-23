import { describe, expect, it } from 'vitest';
import {
  escapeRegex,
  mongoFieldError,
  mongoInFilters,
  mongoRegexFilters,
  RawJson,
  regexPattern,
  serializeMongo,
} from './filter';
import { buildMongoInNumbers, jsonNumber } from '../sql-in-numbers';
import { buildMongoInText } from '../sql-in-text';
import { buildMongoJson } from '../sql-json';
import { buildMongoLike } from '../sql-like';

describe('serializeMongo', () => {
  it('pretty prints objects and keeps scalar arrays inline', () => {
    expect(serializeMongo({ a: { $in: ['x', 1, null] }, b: [] })).toBe(
      '{\n  "a": {\n    "$in": ["x", 1, null]\n  },\n  "b": []\n}',
    );
  });

  it('prints object arrays on several lines', () => {
    expect(serializeMongo({ $or: [{ a: 1 }, { b: 2 }] })).toBe(
      '{\n  "$or": [\n    {\n      "a": 1\n    },\n    {\n      "b": 2\n    }\n  ]\n}',
    );
  });

  it('prints a single line in compact style', () => {
    expect(serializeMongo({ $or: [{ a: 1 }, {}] }, 'compact')).toBe('{ "$or": [{ "a": 1 }, {}] }');
  });

  it('writes raw numbers untouched', () => {
    expect(serializeMongo([new RawJson('12345678901234567890')], 'compact')).toBe(
      '[12345678901234567890]',
    );
  });
});

describe('mongoFieldError', () => {
  it.each([
    ['', { code: 'fieldRequired' }],
    ['$where', { code: 'invalidField', field: '$where' }],
    ['a..b', { code: 'invalidField', field: 'a..b' }],
    ['meta.ref', null],
  ])('checks %j', (field, expected) => {
    expect(mongoFieldError(field)).toEqual(expected);
  });
});

describe('regex helpers', () => {
  it('escapes regex metacharacters', () => {
    expect(escapeRegex('a.b*c(1)/[x]')).toBe('a\\.b\\*c\\(1\\)\\/\\[x\\]');
  });

  it.each([
    ['contains', 'gmail\\.com'],
    ['starts', '^gmail\\.com'],
    ['ends', 'gmail\\.com$'],
    ['exact', '^gmail\\.com$'],
  ] as const)('anchors %s', (match, expected) => {
    expect(regexPattern('gmail.com', match)).toBe(expected);
  });
});

describe('mongoInFilters', () => {
  it('builds one filter per batch with $nin', () => {
    expect(
      mongoInFilters('id', ['a', 'b', 'c'], { not: true, batchSize: 2, style: 'compact' }),
    ).toBe('{ "id": { "$nin": ["a", "b"] } }\n\n{ "id": { "$nin": ["c"] } }');
  });
});

describe('mongoRegexFilters', () => {
  const base = {
    match: 'contains',
    joiner: 'or',
    not: false,
    caseInsensitive: false,
    batchSize: 0,
    style: 'compact',
  } as const;

  it('joins conditions with $or', () => {
    expect(mongoRegexFilters('email', ['a.com', 'b'], base)).toBe(
      '{ "$or": [{ "email": { "$regex": "a\\\\.com" } }, { "email": { "$regex": "b" } }] }',
    );
  });

  it('uses $and, $not and case-insensitive options', () => {
    expect(
      mongoRegexFilters('email', ['x', 'y'], {
        ...base,
        joiner: 'and',
        not: true,
        caseInsensitive: true,
      }),
    ).toBe(
      '{ "$and": [{ "email": { "$not": { "$regex": "x", "$options": "i" } } }, { "email": { "$not": { "$regex": "y", "$options": "i" } } }] }',
    );
  });

  it('skips the joiner for a single value', () => {
    expect(mongoRegexFilters('email', ['x'], { ...base, match: 'exact' })).toBe(
      '{ "email": { "$regex": "^x$" } }',
    );
  });
});

describe('tool builders', () => {
  it('builds a $in filter from text', () => {
    expect(buildMongoInText('a\n"q"\na', { field: 'ref', style: 'compact' })).toEqual({
      output: '{ "ref": { "$in": ["a", "\\"q\\""] } }',
      error: null,
      stats: { total: 3, unique: 2, duplicatesRemoved: 1 },
    });
  });

  it('requires a field', () => {
    expect(buildMongoInText('a').error).toEqual({ code: 'fieldRequired' });
    expect(buildMongoInText('').error).toBeNull();
  });

  it('builds a numeric $in filter and reports invalid numbers', () => {
    expect(
      buildMongoInNumbers('3\n.5\nx\n1', { field: 'n', sort: true, style: 'compact' }),
    ).toMatchObject({
      output: '{ "n": { "$in": [0.5, 1, 3] } }',
      error: { code: 'invalidNumbers', values: ['x'] },
    });
  });

  it('normalizes numbers for JSON', () => {
    expect(jsonNumber('-.5')).toBe('-0.5');
    expect(jsonNumber('10')).toBe('10');
  });

  it('builds a regex filter', () => {
    expect(
      buildMongoLike('gmail.com', { field: 'email', match: 'ends', caseInsensitive: true }).output,
    ).toBe('{\n  "email": {\n    "$regex": "gmail\\\\.com$",\n    "$options": "i"\n  }\n}');
  });
});

describe('buildMongoJson', () => {
  it('joins the column and key path with dots', () => {
    expect(buildMongoJson('a\nb', { column: 'meta', path: 'x.y', style: 'compact' }).output).toBe(
      '{ "meta.x.y": { "$in": ["a", "b"] } }',
    );
  });

  it('validates the path', () => {
    expect(buildMongoJson('a', { path: 'a..b' }).error).toEqual({
      code: 'invalidPath',
      path: 'a..b',
    });
  });
});
