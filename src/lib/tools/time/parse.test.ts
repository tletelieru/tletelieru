import { describe, expect, it } from 'vitest';
import { parseDateTime } from './parse';

describe('parseDateTime', () => {
  it('parses wall times with a space or T', () => {
    expect(parseDateTime('2026-01-15 09:30')).toEqual({
      kind: 'wall',
      wall: { year: 2026, month: 1, day: 15, hour: 9, minute: 30, second: 0, millisecond: 0 },
    });
    expect(parseDateTime(' 2026-01-15T09:30:45.123456 ')).toEqual({
      kind: 'wall',
      wall: { year: 2026, month: 1, day: 15, hour: 9, minute: 30, second: 45, millisecond: 123 },
    });
  });

  it('treats a bare date as midnight', () => {
    expect(parseDateTime('2026-02-28')).toMatchObject({ kind: 'wall', wall: { hour: 0 } });
  });

  it('parses explicit offsets as instants', () => {
    expect(parseDateTime('2026-01-15T09:30:00Z')).toEqual({
      kind: 'instant',
      epochMs: Date.UTC(2026, 0, 15, 9, 30),
      offsetMinutes: 0,
    });
    expect(parseDateTime('2026-01-15T09:30:00-03:00')).toEqual({
      kind: 'instant',
      epochMs: Date.UTC(2026, 0, 15, 12, 30),
      offsetMinutes: -180,
    });
    expect(parseDateTime('2026-01-15 09:30 +0530')).toMatchObject({ offsetMinutes: 330 });
    expect(parseDateTime('2026-01-15 09:30 +05')).toMatchObject({ offsetMinutes: 300 });
    expect(parseDateTime('2026-01-15 09:30 UTC')).toMatchObject({ offsetMinutes: 0 });
  });

  it.each([
    '',
    'tomorrow',
    '2026-13-01',
    '2026-02-29',
    '2026-04-31',
    '2026-01-15 24:00',
    '2026-01-15 10:60',
    '2026-01-15 10:00 +25:00',
    '15/01/2026',
  ])('rejects %s', (input) => {
    expect(parseDateTime(input)).toBeNull();
  });

  it('accepts leap days', () => {
    expect(parseDateTime('2028-02-29')).not.toBeNull();
    expect(parseDateTime('2000-02-29')).not.toBeNull();
    expect(parseDateTime('1900-02-29')).toBeNull();
  });
});
