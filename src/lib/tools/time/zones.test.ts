import { describe, expect, it } from 'vitest';
import {
  formatOffset,
  formatWallTime,
  formatZonedIso,
  getAbbreviation,
  getOffsetMinutes,
  getWallTime,
  isDst,
  isValidTimeZone,
  listTimeZones,
  listTransitions,
  resolveLocalTime,
  type WallTime,
} from './zones';

const SANTIAGO = 'America/Santiago';

function wall(text: string): WallTime {
  const [date, time = '00:00:00'] = text.split(' ');
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute, second = 0] = time.split(':').map(Number);
  return { year, month, day, hour, minute, second, millisecond: 0 };
}

describe('listTimeZones', () => {
  it('includes UTC, Santiago and a +05:30 zone, sorted', () => {
    const zones = listTimeZones();
    expect(zones).toContain('UTC');
    expect(zones).toContain(SANTIAGO);
    expect(zones).toContain('Asia/Kolkata');
    expect([...zones].sort((a, b) => a.localeCompare(b))).toEqual(zones);
  });
});

describe('isValidTimeZone', () => {
  it('accepts IANA names and rejects garbage', () => {
    expect(isValidTimeZone('Europe/Madrid')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
  });
});

describe('offsets', () => {
  it('reads offsets for UTC, Santiago and Kolkata', () => {
    const summer = Date.UTC(2026, 0, 15, 12);
    const winter = Date.UTC(2026, 6, 15, 12);
    expect(getOffsetMinutes(summer, 'UTC')).toBe(0);
    expect(getOffsetMinutes(summer, SANTIAGO)).toBe(-180);
    expect(getOffsetMinutes(winter, SANTIAGO)).toBe(-240);
    expect(getOffsetMinutes(summer, 'Asia/Kolkata')).toBe(330);
    expect(getOffsetMinutes(winter, 'Asia/Kolkata')).toBe(330);
  });

  it('formats offsets', () => {
    expect(formatOffset(-180)).toBe('-03:00');
    expect(formatOffset(330)).toBe('+05:30');
    expect(formatOffset(0)).toBe('+00:00');
    expect(formatOffset(-570, '')).toBe('-0930');
  });

  it('flags DST only where it applies', () => {
    expect(isDst(Date.UTC(2026, 0, 15), SANTIAGO)).toBe(true);
    expect(isDst(Date.UTC(2026, 6, 15), SANTIAGO)).toBe(false);
    expect(isDst(Date.UTC(2026, 6, 15), 'America/New_York')).toBe(true);
    expect(isDst(Date.UTC(2026, 0, 15), 'UTC')).toBe(false);
    expect(isDst(Date.UTC(2026, 0, 15), 'Asia/Kolkata')).toBe(false);
  });

  it('returns abbreviations only when Intl has a named one', () => {
    expect(getAbbreviation(Date.UTC(2026, 0, 15), 'UTC')).toBe('UTC');
    expect(getAbbreviation(Date.UTC(2026, 6, 15), 'America/New_York')).toBe('EDT');
    expect(getAbbreviation(Date.UTC(2026, 0, 15), 'Asia/Kolkata')).toBeNull();
  });
});

describe('wall time formatting', () => {
  it('formats zoned ISO strings', () => {
    const instant = Date.UTC(2026, 0, 15, 12, 30);
    expect(formatZonedIso(instant, 'UTC')).toBe('2026-01-15T12:30:00Z');
    expect(formatZonedIso(instant, SANTIAGO)).toBe('2026-01-15T09:30:00-03:00');
    expect(formatZonedIso(instant, 'Asia/Kolkata')).toBe('2026-01-15T18:00:00+05:30');
    expect(formatZonedIso(instant + 5, 'UTC')).toBe('2026-01-15T12:30:00.005Z');
  });

  it('handles negative epochs', () => {
    expect(formatWallTime(getWallTime(-1, 'UTC'))).toBe('1969-12-31 23:59:59.999');
  });
});

describe('America/Santiago 2026 transitions', () => {
  const transitions = listTransitions(2026, SANTIAGO);

  it('has two transitions, on the first Sunday of April and September', () => {
    expect(transitions).toHaveLength(2);
    const [end, start] = transitions;
    expect(getOffsetMinutes(end - 1000, SANTIAGO)).toBe(-180);
    expect(getOffsetMinutes(end, SANTIAGO)).toBe(-240);
    expect(getOffsetMinutes(start - 1000, SANTIAGO)).toBe(-240);
    expect(getOffsetMinutes(start, SANTIAGO)).toBe(-180);
    for (const [instant, month] of [
      [end, 3],
      [start, 8],
    ]) {
      const date = new Date(instant);
      expect(date.getUTCMonth()).toBe(month);
      expect(date.getUTCDay()).toBe(0);
      expect(date.getUTCDate()).toBeLessThanOrEqual(7);
    }
    expect(new Date(end).toISOString()).toBe('2026-04-05T03:00:00.000Z');
    expect(new Date(start).toISOString()).toBe('2026-09-06T04:00:00.000Z');
  });

  it('reports the hour before the April switch as ambiguous', () => {
    const [end] = transitions;
    const local = getWallTime(end - 30 * 60_000, SANTIAGO);
    expect(formatWallTime(local)).toBe('2026-04-04 23:30:00');
    const result = resolveLocalTime(local, SANTIAGO);
    expect(result).toEqual({
      kind: 'ambiguous',
      earlierMs: end - 30 * 60_000,
      laterMs: end + 30 * 60_000,
    });
  });

  it('reports the skipped hour in September as a gap', () => {
    const [, start] = transitions;
    const result = resolveLocalTime(wall('2026-09-06 00:30'), SANTIAGO);
    expect(result).toEqual({
      kind: 'gap',
      transitionMs: start,
      offsetBefore: -240,
      offsetAfter: -180,
      shiftedMs: Date.UTC(2026, 8, 6, 4, 30),
    });
  });

  it('resolves times right around the transitions uniquely', () => {
    expect(resolveLocalTime(wall('2026-09-06 01:00'), SANTIAGO)).toEqual({
      kind: 'unique',
      epochMs: Date.UTC(2026, 8, 6, 4),
    });
    expect(resolveLocalTime(wall('2026-09-05 23:59:59'), SANTIAGO)).toEqual({
      kind: 'unique',
      epochMs: Date.UTC(2026, 8, 6, 3, 59, 59),
    });
    expect(resolveLocalTime(wall('2026-04-05 00:00'), SANTIAGO)).toEqual({
      kind: 'unique',
      epochMs: Date.UTC(2026, 3, 5, 4),
    });
    expect(resolveLocalTime(wall('2026-04-04 22:59:59'), SANTIAGO)).toEqual({
      kind: 'unique',
      epochMs: Date.UTC(2026, 3, 5, 1, 59, 59),
    });
  });

  it('never has gaps or overlaps in UTC or Kolkata', () => {
    expect(listTransitions(2026, 'UTC')).toEqual([]);
    expect(listTransitions(2026, 'Asia/Kolkata')).toEqual([]);
    expect(resolveLocalTime(wall('2026-09-06 00:30'), 'Asia/Kolkata')).toEqual({
      kind: 'unique',
      epochMs: Date.UTC(2026, 8, 5, 19),
    });
  });
});
