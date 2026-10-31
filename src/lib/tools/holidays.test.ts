import { describe, expect, it } from 'vitest';
import {
  easterSunday,
  FIRST_YEAR,
  formatEpochDay,
  holidaysOf,
  LAST_YEAR,
  toEpochDay,
  weekday,
  type CalendarCountry,
} from './holidays';

function dates(country: CalendarCountry, year: number): string[] {
  return [...holidaysOf(country, year).keys()].map(formatEpochDay);
}

describe('calendar helpers', () => {
  it('computes weekdays in UTC calendar dates', () => {
    expect(weekday(toEpochDay(2026, 10, 30))).toBe(5);
    expect(weekday(toEpochDay(1970, 1, 1))).toBe(4);
  });

  it('round trips dates', () => {
    expect(formatEpochDay(toEpochDay(2028, 2, 29))).toBe('2028-02-29');
  });

  it.each([
    [2021, '2021-04-04'],
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [2030, '2030-04-21'],
  ])('finds Easter %i', (year, expected) => {
    expect(formatEpochDay(easterSunday(year))).toBe(expected);
  });
});

describe('Chile', () => {
  it('matches the 2024 calendar', () => {
    expect(dates('CL', 2024)).toEqual([
      '2024-01-01',
      '2024-03-29',
      '2024-03-30',
      '2024-05-01',
      '2024-05-21',
      '2024-06-20',
      '2024-06-29',
      '2024-07-16',
      '2024-08-15',
      '2024-09-18',
      '2024-09-19',
      '2024-09-20',
      '2024-10-12',
      '2024-10-31',
      '2024-11-01',
      '2024-12-08',
      '2024-12-25',
    ]);
  });

  it.each([
    ['2023-10-27', 'evangelical'],
    ['2018-11-02', 'evangelical'],
    ['2023-01-02', 'newYearBridge'],
    ['2022-09-16', 'extraSeptember'],
    ['2022-09-17', 'independenceBridge'],
    ['2029-09-17', 'independenceBridge'],
    ['2026-06-29', 'peterPaul'],
    ['2023-10-09', 'worlds'],
    ['2021-06-28', 'peterPaul'],
  ])('%s is %s', (date, id) => {
    const [year = 0, month = 0, day = 0] = date.split('-').map(Number);
    expect(holidaysOf('CL', year).get(toEpochDay(year, month, day))).toBe(id);
  });

  it('keeps Saturday and Sunday Peter and Paul in place', () => {
    expect(dates('CL', 2025)).toContain('2025-06-29');
  });
});

describe('Brazil', () => {
  it('matches the 2026 calendar', () => {
    expect(dates('BR', 2026)).toEqual([
      '2026-01-01',
      '2026-02-16',
      '2026-02-17',
      '2026-04-03',
      '2026-04-21',
      '2026-05-01',
      '2026-06-04',
      '2026-09-07',
      '2026-10-12',
      '2026-11-02',
      '2026-11-15',
      '2026-11-20',
      '2026-12-25',
    ]);
  });

  it('adds Black Consciousness Day only since 2024', () => {
    expect(dates('BR', 2023)).not.toContain('2023-11-20');
    expect(dates('BR', 2024)).toContain('2024-11-20');
  });
});

describe('range', () => {
  it('computes every supported year', () => {
    for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
      expect(holidaysOf('CL', year).size).toBeGreaterThanOrEqual(16);
      expect(holidaysOf('BR', year).size).toBeGreaterThanOrEqual(12);
    }
  });
});
