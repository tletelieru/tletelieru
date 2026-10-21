import { describe, expect, it } from 'vitest';
import { listTransitions } from './time/zones';
import {
  convertTimeZones,
  formatConversion,
  joinZoneList,
  nowInZone,
  parseZoneList,
  swapZones,
  type TableLabels,
} from './timezone';

const SANTIAGO = 'America/Santiago';
const [AUTUMN_SWITCH, SPRING_SWITCH] = listTransitions(2026, SANTIAGO);

const labels: TableLabels = {
  dst: 'DST',
  standard: 'standard',
  reading: (reading, offset) => `${reading} (${offset})`,
};

describe('zone lists', () => {
  it('parses and joins comma-separated zones without duplicates', () => {
    expect(parseZoneList(' UTC, Europe/Madrid,,UTC ')).toEqual(['UTC', 'Europe/Madrid']);
    expect(parseZoneList('')).toEqual([]);
    expect(joinZoneList(['UTC', ' Asia/Kolkata', 'UTC'])).toBe('UTC,Asia/Kolkata');
  });
});

describe('convertTimeZones', () => {
  it('returns empty for blank input', () => {
    expect(convertTimeZones('  ', SANTIAGO, ['UTC'])).toEqual({ status: 'empty' });
  });

  it('converts Santiago summer time to UTC, Kolkata and New York', () => {
    const result = convertTimeZones('2026-01-15 09:30', SANTIAGO, [
      'UTC',
      'Asia/Kolkata',
      'America/New_York',
    ]);
    expect(result).toMatchObject({ status: 'ok', kind: 'unique' });
    if (result.status !== 'ok') return;
    const [only] = result.interpretations;
    expect(only.reading).toBeNull();
    expect(only.utcIso).toBe('2026-01-15T12:30:00.000Z');
    expect(only.source).toMatchObject({
      local: '2026-01-15 09:30:00',
      offset: '-03:00',
      dst: true,
    });
    expect(only.targets).toEqual([
      expect.objectContaining({
        zone: 'UTC',
        local: '2026-01-15 12:30:00',
        offset: '+00:00',
        abbreviation: 'UTC',
        dst: false,
      }),
      expect.objectContaining({
        zone: 'Asia/Kolkata',
        local: '2026-01-15 18:00:00',
        offset: '+05:30',
        abbreviation: null,
        dst: false,
      }),
      expect.objectContaining({
        zone: 'America/New_York',
        local: '2026-01-15 07:30:00',
        offset: '-05:00',
        abbreviation: 'EST',
        dst: false,
      }),
    ]);
  });

  it('uses -04:00 for Santiago winter time', () => {
    const result = convertTimeZones('2026-07-01T08:00', SANTIAGO, ['UTC']);
    expect(result.status === 'ok' && result.interpretations[0].utcIso).toBe(
      '2026-07-01T12:00:00.000Z',
    );
  });

  it('converts from a +05:30 zone', () => {
    const result = convertTimeZones('2026-03-01 00:00', 'Asia/Kolkata', ['UTC', SANTIAGO]);
    expect(
      result.status === 'ok' && result.interpretations[0].targets.map((time) => time.local),
    ).toEqual(['2026-02-28 18:30:00', '2026-02-28 15:30:00']);
  });

  it('honours an explicit offset in the input', () => {
    const result = convertTimeZones('2026-01-15T12:00:00Z', SANTIAGO, ['Asia/Kolkata']);
    expect(result).toMatchObject({ status: 'ok', kind: 'explicit-offset', offset: '+00:00' });
    if (result.status !== 'ok') return;
    expect(result.interpretations[0].source.local).toBe('2026-01-15 09:00:00');
    expect(result.interpretations[0].targets[0].local).toBe('2026-01-15 17:30:00');
  });

  it('returns both readings of an ambiguous April time in Santiago', () => {
    expect(new Date(AUTUMN_SWITCH).toISOString()).toBe('2026-04-05T03:00:00.000Z');
    const result = convertTimeZones('2026-04-04 23:30', SANTIAGO, ['UTC']);
    expect(result).toMatchObject({
      status: 'ok',
      kind: 'ambiguous',
      local: '2026-04-04 23:30:00',
      zone: SANTIAGO,
    });
    if (result.status !== 'ok') return;
    expect(
      result.interpretations.map((item) => [item.reading, item.source.offset, item.utcIso]),
    ).toEqual([
      ['earlier', '-03:00', '2026-04-05T02:30:00.000Z'],
      ['later', '-04:00', '2026-04-05T03:30:00.000Z'],
    ]);
    expect(result.interpretations.map((item) => item.source.dst)).toEqual([true, false]);
  });

  it('reports a non-existent September time in Santiago as a gap', () => {
    expect(new Date(SPRING_SWITCH).toISOString()).toBe('2026-09-06T04:00:00.000Z');
    const result = convertTimeZones('2026-09-06 00:30', SANTIAGO, ['UTC']);
    expect(result).toMatchObject({
      status: 'gap',
      local: '2026-09-06 00:30:00',
      zone: SANTIAGO,
      jumpFrom: '2026-09-06 00:00',
      jumpTo: '01:00',
      offsetBefore: '-04:00',
      offsetAfter: '-03:00',
      suggestion: { local: '2026-09-06 01:30:00', offset: '-03:00' },
    });
  });

  it('accepts the first valid minute after the gap', () => {
    const result = convertTimeZones('2026-09-06 01:00', SANTIAGO, ['UTC']);
    expect(result.status === 'ok' && result.interpretations[0].utcIso).toBe(
      '2026-09-06T04:00:00.000Z',
    );
  });

  it('reports invalid input and unknown zones', () => {
    expect(convertTimeZones('yesterday', SANTIAGO, ['UTC'])).toEqual({ status: 'invalid-input' });
    expect(convertTimeZones('2026-01-01', 'Nowhere/City', ['UTC'])).toEqual({
      status: 'invalid-zone',
      zone: 'Nowhere/City',
    });
    expect(convertTimeZones('2026-01-01', 'UTC', ['Bad/Zone'])).toEqual({
      status: 'invalid-zone',
      zone: 'Bad/Zone',
    });
  });
});

describe('formatConversion', () => {
  it('renders an aligned table with the given labels', () => {
    const text = formatConversion(convertTimeZones('2026-01-15 09:30', SANTIAGO, ['UTC']), labels);
    expect(text).toBe(
      [
        'America/Santiago  2026-01-15 09:30:00  -03:00  -    DST',
        'UTC               2026-01-15 12:30:00  +00:00  UTC  standard',
      ].join('\n'),
    );
  });

  it('labels each reading of an ambiguous time', () => {
    const text = formatConversion(convertTimeZones('2026-04-04 23:30', SANTIAGO, ['UTC']), labels);
    const blocks = text.split('\n\n');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].startsWith('earlier (-03:00)\n')).toBe(true);
    expect(blocks[1].startsWith('later (-04:00)\n')).toBe(true);
  });

  it('is empty when there is nothing to show', () => {
    expect(formatConversion({ status: 'empty' }, labels)).toBe('');
  });
});

describe('swapZones', () => {
  it('swaps source and first target and keeps the same instant', () => {
    expect(swapZones('2026-01-15 09:30', SANTIAGO, ['UTC', 'Europe/Madrid'])).toEqual({
      input: '2026-01-15 12:30:00',
      source: 'UTC',
      targets: [SANTIAGO, 'Europe/Madrid'],
    });
  });

  it('keeps inputs with explicit offsets and does nothing without targets', () => {
    expect(swapZones('2026-01-15T09:30Z', SANTIAGO, ['UTC']).input).toBe('2026-01-15T09:30Z');
    expect(swapZones('x', SANTIAGO, [])).toEqual({ input: 'x', source: SANTIAGO, targets: [] });
  });
});

describe('nowInZone', () => {
  it('formats the given instant in the zone', () => {
    expect(nowInZone(Date.UTC(2026, 0, 15, 12, 0, 0, 999), SANTIAGO)).toBe('2026-01-15 09:00:00');
  });
});
