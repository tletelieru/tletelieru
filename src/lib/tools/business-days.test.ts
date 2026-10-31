import { describe, expect, it } from 'vitest';
import {
  addBusinessDays,
  countBusinessDays,
  isBusinessDay,
  parseCalendarDate,
  processBusinessDays,
  type BusinessOptions,
} from './business-days';
import { formatEpochDay, toEpochDay } from './holidays';

const day = (year: number, month: number, date: number) => toEpochDay(year, month, date);

function added(country: 'CL' | 'BR', start: number, amount: number): string {
  const result = addBusinessDays(country, start, amount);
  if (!result.ok) throw new Error('range');
  return formatEpochDay(result.day);
}

describe('parseCalendarDate', () => {
  it('accepts real dates', () => {
    expect(parseCalendarDate('2028-02-29')).toBe(day(2028, 2, 29));
  });

  it.each(['2027-02-29', '2026-13-01', '30/10/2026', 'abc', ''])('rejects %s', (text) => {
    expect(parseCalendarDate(text)).toBeNull();
  });
});

describe('addBusinessDays', () => {
  it('skips weekends', () => {
    expect(added('CL', day(2026, 10, 30), 1)).toBe('2026-11-02');
  });

  it('skips Fiestas Patrias in Chile', () => {
    const result = addBusinessDays('CL', day(2024, 9, 17), 1);
    expect(result).toMatchObject({ ok: true });
    expect(added('CL', day(2024, 9, 17), 1)).toBe('2024-09-23');
  });

  it('subtracts days', () => {
    expect(added('CL', day(2024, 9, 23), -1)).toBe('2024-09-17');
  });

  it('skips Carnival in Brazil but not in Chile', () => {
    expect(added('BR', day(2026, 2, 13), 1)).toBe('2026-02-18');
    expect(added('CL', day(2026, 2, 13), 1)).toBe('2026-02-16');
  });

  it('returns the same date for zero days', () => {
    expect(added('CL', day(2026, 10, 31), 0)).toBe('2026-10-31');
  });

  it('crosses years and lists skipped weekdays', () => {
    const result = addBusinessDays('CL', day(2025, 12, 31), 1);
    expect(result).toMatchObject({ ok: true, skipped: [{ id: 'newYear' }] });
    expect(added('CL', day(2025, 12, 31), 1)).toBe('2026-01-02');
  });

  it('stops outside the supported years', () => {
    expect(addBusinessDays('CL', day(2020, 1, 1), 1)).toEqual({ ok: false });
    expect(addBusinessDays('CL', day(2035, 12, 31), 5)).toEqual({ ok: false });
  });
});

describe('countBusinessDays', () => {
  it('excludes the start date by default', () => {
    expect(countBusinessDays('CL', day(2026, 10, 26), day(2026, 10, 30), false)).toMatchObject({
      business: 4,
      calendar: 4,
    });
  });

  it('can include the start date', () => {
    expect(countBusinessDays('CL', day(2026, 10, 26), day(2026, 10, 30), true)).toMatchObject({
      business: 5,
    });
  });

  it('discounts holidays', () => {
    const result = countBusinessDays('CL', day(2024, 9, 16), day(2024, 9, 23), false);
    expect(result).toMatchObject({ business: 2 });
  });

  it('is negative when the range is reversed', () => {
    expect(countBusinessDays('CL', day(2026, 10, 30), day(2026, 10, 26), false)).toMatchObject({
      business: -4,
      calendar: -4,
    });
  });
});

describe('isBusinessDay', () => {
  it('tells weekdays, weekends and holidays apart', () => {
    expect(isBusinessDay('CL', day(2026, 10, 30))).toBe(true);
    expect(isBusinessDay('CL', day(2026, 10, 31))).toBe(false);
    expect(isBusinessDay('BR', day(2026, 11, 20))).toBe(false);
  });
});

describe('processBusinessDays', () => {
  const options: BusinessOptions = { mode: 'add', country: 'CL', days: 3, includeStart: false };

  it('reads one date per line', () => {
    expect(processBusinessDays('2026-10-26\n\n2026-10-27', options)).toHaveLength(2);
  });

  it('reads pairs in count mode', () => {
    const [result] = processBusinessDays('2026-10-26 → 2026-10-30', { ...options, mode: 'count' });
    expect(result).toMatchObject({ ok: true, business: 4 });
  });

  it('reports errors by line', () => {
    expect(processBusinessDays('nope', options)[0]).toMatchObject({ error: 'date', line: 1 });
    expect(processBusinessDays('2019-01-01', options)[0]).toMatchObject({ error: 'range' });
    expect(processBusinessDays('2026-01-01', { ...options, mode: 'count' })[0]).toMatchObject({
      error: 'pair',
    });
  });
});
