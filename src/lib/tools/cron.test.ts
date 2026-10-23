import { describe, expect, it } from 'vitest';
import { describeCron, formatRun, nextRuns, normalizeCron, parseCron } from './cron';

describe('parseCron', () => {
  it('accepts 5 and 6 field expressions', () => {
    expect(parseCron(' */5  * * * * ')).toEqual({
      ok: true,
      info: { expression: '*/5 * * * *', fields: 5, seconds: false },
    });
    expect(parseCron('30 0 9 * * 1')).toMatchObject({
      ok: true,
      info: { fields: 6, seconds: true },
    });
  });

  it('accepts nicknames', () => {
    expect(parseCron('@daily')).toMatchObject({ ok: true, info: { fields: 5 } });
  });

  it('rejects the wrong number of fields', () => {
    expect(parseCron('* * *')).toEqual({ ok: false, error: { code: 'fieldCount', count: 3 } });
    expect(parseCron('* * * * * * *')).toEqual({
      ok: false,
      error: { code: 'fieldCount', count: 7 },
    });
  });

  it('rejects out-of-range values', () => {
    expect(parseCron('61 * * * *')).toEqual({
      ok: false,
      error: { code: 'invalid', message: 'Invalid value for minute: 61' },
    });
  });

  it('rejects empty input', () => {
    expect(parseCron('  ')).toEqual({ ok: false, error: { code: 'empty' } });
    expect(normalizeCron('a\t b')).toBe('a b');
  });
});

describe('describeCron', () => {
  it('describes in English and Spanish', () => {
    expect(describeCron('0 9 * * 1-5', 'en')).toBe('At 09:00, Monday through Friday');
    expect(describeCron('0 9 * * 1-5', 'es')).toBe('A las 09:00, de lunes a viernes');
  });

  it('returns an empty string when it cannot describe', () => {
    expect(describeCron('nope', 'en')).toBe('');
  });
});

describe('nextRuns', () => {
  const from = new Date('2026-10-23T12:00:00Z');

  it('computes runs in a time zone', () => {
    expect(
      nextRuns('0 9 * * 1-5', 'America/Santiago', from, 2).map((date) => date.toISOString()),
    ).toEqual(['2026-10-26T12:00:00.000Z', '2026-10-27T12:00:00.000Z']);
  });

  it('supports seconds and caps the count', () => {
    expect(nextRuns('*/30 * * * * *', 'UTC', from, 2).map((date) => date.toISOString())).toEqual([
      '2026-10-23T12:00:30.000Z',
      '2026-10-23T12:01:00.000Z',
    ]);
    expect(nextRuns('* * * * *', 'UTC', from, 500)).toHaveLength(50);
  });

  it('formats runs with the zone and ISO time', () => {
    expect(formatRun(new Date('2026-10-26T12:00:00Z'), 'UTC', 'en')).toContain(
      '(2026-10-26T12:00:00.000Z)',
    );
  });
});
