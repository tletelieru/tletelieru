import { describe, expect, it } from 'vitest';
import {
  convertUnix,
  convertUnixLine,
  describeInstant,
  detectUnit,
  formatDayOfWeek,
  formatRelative,
  formatRfc2822,
  formatUnixOutput,
  parseTimestamp,
  type UnixLabels,
} from './unix';

const NOW = Date.UTC(2026, 9, 20, 12, 0, 0);
const SANTIAGO = 'America/Santiago';

const labels: UnixLabels = {
  fields: {
    seconds: 'Seconds',
    milliseconds: 'Milliseconds',
    isoUtc: 'ISO 8601 UTC',
    isoZone: 'ISO 8601 zone',
    rfc2822: 'RFC 2822',
    relative: 'Relative',
    dayOfWeek: 'Day of week',
  },
  units: { s: 'seconds', ms: 'milliseconds', us: 'microseconds', ns: 'nanoseconds' },
  date: 'date',
  error: (error, input, zone) => `${input}  ✘ ${error} ${zone}`,
  ambiguous: (zone, laterSeconds) => `ambiguous ${zone} ${laterSeconds}`,
};

describe('detectUnit', () => {
  it.each([
    ['0', 's'],
    ['1700000000', 's'],
    ['99999999999', 's'],
    ['100000000000', 'ms'],
    ['1700000000000', 'ms'],
    ['99999999999999', 'ms'],
    ['100000000000000', 'us'],
    ['1700000000000000', 'us'],
    ['99999999999999999', 'us'],
    ['100000000000000000', 'ns'],
    ['1700000000000000000', 'ns'],
    ['0001700000000', 's'],
  ])('%s is %s', (digits, unit) => {
    expect(detectUnit(digits)).toBe(unit);
  });
});

describe('parseTimestamp', () => {
  it('normalizes every unit to milliseconds', () => {
    expect(parseTimestamp('1700000000')).toEqual({ epochMs: 1_700_000_000_000, unit: 's' });
    expect(parseTimestamp('1700000000123')).toEqual({ epochMs: 1_700_000_000_123, unit: 'ms' });
    expect(parseTimestamp('1700000000123456')).toEqual({ epochMs: 1_700_000_000_123, unit: 'us' });
    expect(parseTimestamp('1700000000123456789')).toEqual({
      epochMs: 1_700_000_000_123,
      unit: 'ns',
    });
  });

  it('supports fractional seconds, separators and forced units', () => {
    expect(parseTimestamp('1700000000.5')).toEqual({ epochMs: 1_700_000_000_500, unit: 's' });
    expect(parseTimestamp('1_700_000_000')).toEqual({ epochMs: 1_700_000_000_000, unit: 's' });
    expect(parseTimestamp('1700000000', 'ms')).toEqual({ epochMs: 1_700_000_000, unit: 'ms' });
  });

  it('handles negative timestamps', () => {
    expect(parseTimestamp('-86400')).toEqual({ epochMs: -86_400_000, unit: 's' });
    expect(parseTimestamp('-1', 'ns')).toEqual({ epochMs: -1, unit: 'ns' });
    expect(parseTimestamp('-1.5')).toEqual({ epochMs: -1500, unit: 's' });
  });

  it('rejects invalid and out-of-range values', () => {
    expect(parseTimestamp('abc')).toBeNull();
    expect(parseTimestamp('12e5')).toBeNull();
    expect(parseTimestamp('')).toBeNull();
    expect(parseTimestamp('9000000000000000', 'ms')).toBeNull();
  });
});

describe('formatRelative', () => {
  it.each([
    [NOW - 3 * 3_600_000, '3 hours ago'],
    [NOW + 2 * 86_400_000, 'in 2 days'],
    [NOW - 86_400_000, 'yesterday'],
    [NOW + 30_000, 'in 30 seconds'],
    [NOW - 2 * 31_536_000_000, '2 years ago'],
    [NOW, 'now'],
    [NOW + 400, 'now'],
  ])('formats %s', (epochMs, expected) => {
    expect(formatRelative(epochMs, NOW)).toBe(expected);
  });
});

describe('formatRfc2822', () => {
  it('formats in UTC and in a zone', () => {
    expect(formatRfc2822(1_700_000_000_000)).toBe('Tue, 14 Nov 2023 22:13:20 +0000');
    expect(formatRfc2822(1_700_000_000_000, SANTIAGO)).toBe('Tue, 14 Nov 2023 19:13:20 -0300');
    expect(formatRfc2822(1_700_000_000_000, 'Asia/Kolkata')).toBe(
      'Wed, 15 Nov 2023 03:43:20 +0530',
    );
  });
});

describe('describeInstant', () => {
  it('returns every representation', () => {
    expect(describeInstant(1_700_000_000_000, SANTIAGO, NOW)).toEqual({
      seconds: '1700000000',
      milliseconds: '1700000000000',
      isoUtc: '2023-11-14T22:13:20.000Z',
      isoZone: '2023-11-14T19:13:20-03:00',
      rfc2822: 'Tue, 14 Nov 2023 19:13:20 -0300',
      relative: '3 years ago',
      dayOfWeek: 'Tuesday',
    });
  });

  it('floors seconds for negative instants', () => {
    expect(describeInstant(-1500, 'UTC', NOW)).toMatchObject({
      seconds: '-2',
      milliseconds: '-1500',
      isoUtc: '1969-12-31T23:59:58.500Z',
      dayOfWeek: 'Wednesday',
    });
  });
});

describe('locale-aware formatting', () => {
  it('formats relative time in Spanish', () => {
    expect(formatRelative(NOW - 3 * 3_600_000, NOW, 'es')).toBe('hace 3 horas');
    expect(formatRelative(NOW + 2 * 86_400_000, NOW, 'es')).toBe('pasado mañana');
    expect(formatRelative(NOW + 5 * 86_400_000, NOW, 'es')).toBe('dentro de 5 días');
  });

  it('formats the day of week in the zone and locale', () => {
    expect(formatDayOfWeek(1_700_000_000_000, SANTIAGO, 'en')).toBe('Tuesday');
    expect(formatDayOfWeek(1_700_000_000_000, SANTIAGO, 'es')).toBe('martes');
    expect(formatDayOfWeek(1_700_000_000_000, 'Asia/Kolkata', 'es')).toBe('miércoles');
  });

  it('keeps machine formats locale-independent', () => {
    const english = describeInstant(1_700_000_000_000, SANTIAGO, NOW, 'en');
    const spanish = describeInstant(1_700_000_000_000, SANTIAGO, NOW, 'es');
    expect(spanish.isoZone).toBe(english.isoZone);
    expect(spanish.rfc2822).toBe(english.rfc2822);
    expect(spanish.relative).toBe('hace 3 años');
  });
});

describe('convertUnixLine', () => {
  const options = { zone: SANTIAGO, now: NOW };

  it('converts ISO strings back to seconds and milliseconds', () => {
    const line = convertUnixLine('2023-11-14T22:13:20Z', options);
    expect(line).toMatchObject({
      ok: true,
      unit: null,
      details: { seconds: '1700000000', milliseconds: '1700000000000' },
    });
  });

  it('interprets dates without offset in the selected zone', () => {
    const line = convertUnixLine('2023-11-14 19:13:20', options);
    expect(line.ok && line.details.seconds).toBe('1700000000');
  });

  it('accepts RFC 2822 strings', () => {
    const line = convertUnixLine('Tue, 14 Nov 2023 19:13:20 -0300', options);
    expect(line.ok && line.details.seconds).toBe('1700000000');
  });

  it('flags DST gaps and ambiguous local times', () => {
    expect(convertUnixLine('2026-09-06 00:30', options)).toEqual({
      ok: false,
      input: '2026-09-06 00:30',
      error: 'gap',
    });
    const ambiguous = convertUnixLine('2026-04-04 23:30', options);
    expect(ambiguous.ok && ambiguous.details.isoUtc).toBe('2026-04-05T02:30:00.000Z');
    expect(ambiguous.ok && ambiguous.ambiguousLaterMs).toBe(Date.UTC(2026, 3, 5, 3, 30));
  });

  it('reports invalid input', () => {
    expect(convertUnixLine('hello', options)).toEqual({
      ok: false,
      input: 'hello',
      error: 'unrecognized',
    });
    expect(convertUnixLine('Tue, 14 Nov 2023 19:13:20', options).ok).toBe(false);
    expect(convertUnixLine('9'.repeat(31), options)).toMatchObject({
      ok: false,
      error: 'out-of-range',
    });
  });

  it('falls back to UTC for an unknown zone', () => {
    const line = convertUnixLine('0', { zone: 'Bad/Zone', now: NOW });
    expect(line.ok && line.details.isoZone).toBe('1970-01-01T00:00:00Z');
  });
});

describe('round trips', () => {
  it.each(['0', '1700000000', '-86400', '99999999999', '-99999999999', '1767225600'])(
    'seconds %s survive a trip through ISO',
    (seconds) => {
      const forward = convertUnixLine(seconds, { now: NOW });
      if (!forward.ok) throw new Error('expected a valid timestamp');
      const back = convertUnixLine(forward.details.isoUtc, { now: NOW });
      expect(back.ok && back.details.seconds).toBe(seconds);
      const zoned = convertUnixLine(forward.details.isoZone, { zone: SANTIAGO, now: NOW });
      expect(zoned.ok && zoned.details.seconds).toBe(seconds);
    },
  );

  it('milliseconds survive a trip through the zoned ISO string', () => {
    const forward = convertUnixLine('1700000000123', { zone: SANTIAGO, now: NOW });
    if (!forward.ok) throw new Error('expected a valid timestamp');
    expect(forward.details.isoZone).toBe('2023-11-14T19:13:20.123-03:00');
    const back = convertUnixLine(forward.details.isoZone, { now: NOW });
    expect(back.ok && back.details.milliseconds).toBe('1700000000123');
  });
});

describe('formatUnixOutput', () => {
  it('prints one value per line for a single field', () => {
    const lines = convertUnix('1700000000\n\nnope\n1700000000000', { now: NOW });
    expect(formatUnixOutput(lines, 'isoUtc', 'UTC', labels)).toBe(
      ['2023-11-14T22:13:20.000Z', 'nope  ✘ unrecognized UTC', '2023-11-14T22:13:20.000Z'].join(
        '\n',
      ),
    );
  });

  it('prints a labelled block per input', () => {
    const lines = convertUnix('1700000000', { zone: SANTIAGO, now: NOW });
    expect(formatUnixOutput(lines, 'all', SANTIAGO, labels)).toBe(
      [
        '1700000000  (seconds)',
        '  Seconds        1700000000',
        '  Milliseconds   1700000000000',
        '  ISO 8601 UTC   2023-11-14T22:13:20.000Z',
        '  ISO 8601 zone  2023-11-14T19:13:20-03:00  America/Santiago',
        '  RFC 2822       Tue, 14 Nov 2023 19:13:20 -0300',
        '  Relative       3 years ago',
        '  Day of week    Tuesday',
      ].join('\n'),
    );
  });

  it('adds a note for ambiguous local times', () => {
    const lines = convertUnix('2026-04-04 23:30', { zone: SANTIAGO, now: NOW });
    const text = formatUnixOutput(lines, 'all', SANTIAGO, labels);
    expect(text.startsWith('2026-04-04 23:30  (date)\n')).toBe(true);
    expect(
      text.endsWith(`  ! ambiguous America/Santiago ${Date.UTC(2026, 3, 5, 3, 30) / 1000}`),
    ).toBe(true);
  });
});
