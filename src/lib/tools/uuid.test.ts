import { describe, expect, it } from 'vitest';
import {
  CROCKFORD,
  NANOID_ALPHABET,
  decodeUlidTime,
  formatId,
  generateIds,
  generateUlids,
  inspectId,
  nanoid,
  ulid,
  uuidV4,
  uuidV7,
  validateNanoidAlphabet,
  type RandomBytes,
} from './uuid';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ULID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;
const NOW = 1715000000000;

function sequence(start = 0): RandomBytes {
  let next = start;
  return (length) => Uint8Array.from({ length }, () => next++ % 256);
}

const zeros: RandomBytes = (length) => new Uint8Array(length);
const ones: RandomBytes = (length) => new Uint8Array(length).fill(255);

describe('uuidV4', () => {
  it('sets version 4 and the RFC variant', () => {
    for (const random of [zeros, ones, sequence()]) {
      const id = uuidV4(random);
      expect(id).toMatch(UUID);
      expect(id[14]).toBe('4');
    }
    expect(uuidV4(zeros)).toBe('00000000-0000-4000-8000-000000000000');
    expect(uuidV4(ones)).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
  });

  it('is random with the default source', () => {
    expect(uuidV4()).not.toBe(uuidV4());
  });
});

describe('uuidV7', () => {
  it('embeds the Unix ms timestamp in the first 48 bits', () => {
    const id = uuidV7(NOW, zeros);
    expect(id).toBe('018f4df7-3e00-7000-8000-000000000000');
    expect(id).toMatch(UUID);
  });

  it('round trips the timestamp through inspect', () => {
    const result = inspectId(uuidV7(NOW, sequence(7)));
    expect(result).toMatchObject({
      kind: 'uuid',
      version: 7,
      variant: 'rfc9562',
      time: { ms: NOW, iso: '2024-05-06T12:53:20.000Z' },
    });
  });

  it('sorts by time', () => {
    const ids = [uuidV7(NOW + 2), uuidV7(NOW), uuidV7(NOW + 1)];
    expect([...ids].sort()).toEqual([ids[1], ids[2], ids[0]]);
  });
});

describe('ulid', () => {
  it('encodes 48-bit time and 80-bit randomness in Crockford base32', () => {
    expect(ulid(0, zeros)).toBe('0'.repeat(26));
    expect(ulid(NOW, ones)).toMatch(/^[0-9A-Z]{10}Z{16}$/);
    expect(ulid(NOW)).toMatch(ULID);
  });

  it('round trips the time', () => {
    const id = ulid(NOW, sequence());
    expect(decodeUlidTime(id)).toBe(NOW);
    expect(inspectId(id)).toMatchObject({
      kind: 'ulid',
      time: { ms: NOW, iso: '2024-05-06T12:53:20.000Z' },
    });
  });

  it('decodes the spec sample', () => {
    expect(decodeUlidTime('01ARYZ6S41TSV4RRFFQ69G5FAV')).toBe(1469918176385);
  });

  it('increments the randomness within the same ms when monotonic', () => {
    const ids = generateUlids(5, { now: NOW, monotonic: true }, sequence(200));
    expect(new Set(ids.map((id) => id.slice(0, 10))).size).toBe(1);
    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(5);
    const last = ids[0].slice(-1);
    expect(ids[1].slice(-1)).toBe(CROCKFORD[CROCKFORD.indexOf(last) + 1]);
  });

  it('carries the increment across bytes', () => {
    const ids = generateUlids(2, { now: NOW }, ones);
    expect(ids[0].slice(10)).toBe('Z'.repeat(16));
    expect(ids[1].slice(10)).toBe('0'.repeat(16));
  });

  it('draws fresh randomness when not monotonic', () => {
    const ids = generateUlids(3, { now: NOW, monotonic: false }, sequence());
    expect(new Set(ids).size).toBe(3);
    expect(ids[1] > ids[0]).toBe(true);
  });
});

describe('nanoid', () => {
  it('uses the default alphabet and size', () => {
    const id = nanoid();
    expect(id).toHaveLength(21);
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(nanoid(5, NANOID_ALPHABET, sequence())).toBe('ABCDE');
  });

  it('respects a custom alphabet and size without bias', () => {
    const id = nanoid(40, 'abc', sequence());
    expect(id).toHaveLength(40);
    expect(id).toMatch(/^[abc]+$/);
    expect(nanoid(4, 'xy', zeros)).toBe('xxxx');
  });

  it('validates custom alphabets', () => {
    expect(validateNanoidAlphabet('a')).toBe('alphabetTooShort');
    expect(validateNanoidAlphabet('aa')).toBe('alphabetDuplicate');
    expect(validateNanoidAlphabet('x'.repeat(300))).toBe('alphabetTooLong');
    expect(validateNanoidAlphabet('ab')).toBeNull();
  });
});

describe('generateIds', () => {
  it('generates the requested amount of each type', () => {
    expect(generateIds({ type: 'v4', count: 3 })).toMatchObject({ ok: true });
    for (const type of ['v4', 'v7', 'ulid', 'nanoid'] as const) {
      const result = generateIds({ type, count: 4 });
      expect(result.ok && result.ids).toHaveLength(4);
    }
  });

  it('passes now and the random source through', () => {
    expect(generateIds({ type: 'v7' }, zeros, NOW)).toEqual({
      ok: true,
      ids: ['018f4df7-3e00-7000-8000-000000000000'],
    });
  });

  it('reports invalid nanoid options', () => {
    expect(generateIds({ type: 'nanoid', alphabet: 'z' })).toEqual({
      ok: false,
      error: 'alphabetTooShort',
    });
    expect(generateIds({ type: 'nanoid', size: 0 })).toEqual({ ok: false, error: 'size' });
  });
});

describe('formatId', () => {
  const id = '018f4df7-3e00-7abc-8000-000000000000';

  it('applies case and hyphens to UUIDs', () => {
    expect(formatId(id, 'v7')).toBe(id);
    expect(formatId(id, 'v7', { letterCase: 'upper', hyphens: false })).toBe(
      '018F4DF73E007ABC8000000000000000',
    );
  });

  it('keeps ULIDs uppercase by default and leaves nanoids alone', () => {
    expect(formatId('01arz3ndektsv4rrffq69g5fav', 'ulid')).toBe('01ARZ3NDEKTSV4RRFFQ69G5FAV');
    expect(formatId('01ARZ3NDEKTSV4RRFFQ69G5FAV', 'ulid', { letterCase: 'lower' })).toBe(
      '01arz3ndektsv4rrffq69g5fav',
    );
    expect(formatId('aB-_', 'nanoid', { letterCase: 'upper' })).toBe('aB-_');
  });
});

describe('inspectId', () => {
  it('recognizes the nil and max UUIDs', () => {
    expect(inspectId('00000000-0000-0000-0000-000000000000')).toEqual({
      kind: 'nil',
      canonical: '00000000-0000-0000-0000-000000000000',
    });
    expect(inspectId('FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF')).toEqual({
      kind: 'max',
      canonical: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    });
  });

  it('decodes the v1 Gregorian timestamp', () => {
    expect(inspectId('b4cc8000-a838-11ee-8000-000000000000')).toEqual({
      kind: 'uuid',
      canonical: 'b4cc8000-a838-11ee-8000-000000000000',
      version: 1,
      variant: 'rfc9562',
      time: { ms: Date.UTC(2024, 0, 1), iso: '2024-01-01T00:00:00.000Z' },
    });
  });

  it('decodes the v6 reordered timestamp', () => {
    expect(inspectId('1eea838b-4cc8-6000-8000-000000000000')).toMatchObject({
      version: 6,
      time: { iso: '2024-01-01T00:00:00.000Z' },
    });
  });

  it('accepts braces, URNs and missing hyphens', () => {
    for (const input of [
      '{018f4df7-3e00-7000-8000-000000000000}',
      'urn:uuid:018f4df7-3e00-7000-8000-000000000000',
      '018F4DF73E0070008000000000000000',
    ]) {
      expect(inspectId(input)).toMatchObject({
        kind: 'uuid',
        canonical: '018f4df7-3e00-7000-8000-000000000000',
        version: 7,
      });
    }
  });

  it('reports v4 without a timestamp and other variants', () => {
    expect(inspectId('9f1c2a3b-4d5e-4f60-9a1b-2c3d4e5f6a7b')).toEqual({
      kind: 'uuid',
      canonical: '9f1c2a3b-4d5e-4f60-9a1b-2c3d4e5f6a7b',
      version: 4,
      variant: 'rfc9562',
    });
    expect(inspectId('9f1c2a3b-4d5e-4f60-ca1b-2c3d4e5f6a7b')).toMatchObject({
      variant: 'microsoft',
    });
    expect(inspectId('9f1c2a3b-4d5e-4f60-1a1b-2c3d4e5f6a7b')).toMatchObject({ variant: 'ncs' });
  });

  it('rejects garbage and out-of-range ULIDs', () => {
    expect(inspectId('hello')).toEqual({ kind: 'invalid' });
    expect(inspectId('81ARZ3NDEKTSV4RRFFQ69G5FAV')).toEqual({ kind: 'invalid' });
    expect(inspectId('01ARZ3NDEKTSV4RRFFQ69G5FAI')).toEqual({ kind: 'invalid' });
  });
});
