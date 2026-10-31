export const calendarCountries = ['CL', 'BR'] as const;
export type CalendarCountry = (typeof calendarCountries)[number];

export type HolidayId =
  | 'newYear'
  | 'newYearBridge'
  | 'goodFriday'
  | 'holySaturday'
  | 'labor'
  | 'navy'
  | 'indigenous'
  | 'peterPaul'
  | 'carmen'
  | 'assumption'
  | 'independenceBridge'
  | 'independence'
  | 'army'
  | 'extraSeptember'
  | 'worlds'
  | 'evangelical'
  | 'allSaints'
  | 'conception'
  | 'christmas'
  | 'carnival'
  | 'tiradentes'
  | 'corpusChristi'
  | 'independenceBr'
  | 'aparecida'
  | 'allSouls'
  | 'republic'
  | 'blackConsciousness';

export interface Holiday {
  day: number;
  id: HolidayId;
}

export const FIRST_YEAR = 2021;
export const LAST_YEAR = 2035;

const DAY_MS = 86_400_000;

const INDIGENOUS_DAY: Record<number, number> = {
  2021: 21,
  2022: 21,
  2023: 21,
  2024: 20,
  2025: 20,
  2026: 21,
  2027: 21,
  2028: 20,
  2029: 20,
  2030: 21,
  2031: 21,
  2032: 20,
  2033: 20,
  2034: 21,
  2035: 21,
};

export function toEpochDay(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

export function formatEpochDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function weekday(day: number): number {
  return (((day + 4) % 7) + 7) % 7;
}

export function yearOf(day: number): number {
  return new Date(day * DAY_MS).getUTCFullYear();
}

export function easterSunday(year: number): number {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const date = ((h + l - 7 * m + 114) % 31) + 1;
  return toEpochDay(year, month, date);
}

function movedToMonday(day: number): number {
  const current = weekday(day);
  if (current >= 2 && current <= 4) return day - (current - 1);
  return current === 5 ? day + 3 : day;
}

function evangelicalDay(year: number): number {
  const day = toEpochDay(year, 10, 31);
  const current = weekday(day);
  if (current === 2) return day - 4;
  return current === 3 ? day + 2 : day;
}

function chile(year: number): Holiday[] {
  const easter = easterSunday(year);
  const date = (month: number, day: number) => toEpochDay(year, month, day);
  const list: Holiday[] = [
    { day: date(1, 1), id: 'newYear' },
    { day: easter - 2, id: 'goodFriday' },
    { day: easter - 1, id: 'holySaturday' },
    { day: date(5, 1), id: 'labor' },
    { day: date(5, 21), id: 'navy' },
    { day: date(6, INDIGENOUS_DAY[year] ?? 21), id: 'indigenous' },
    { day: movedToMonday(date(6, 29)), id: 'peterPaul' },
    { day: date(7, 16), id: 'carmen' },
    { day: date(8, 15), id: 'assumption' },
    { day: date(9, 18), id: 'independence' },
    { day: date(9, 19), id: 'army' },
    { day: movedToMonday(date(10, 12)), id: 'worlds' },
    { day: evangelicalDay(year), id: 'evangelical' },
    { day: date(11, 1), id: 'allSaints' },
    { day: date(12, 8), id: 'conception' },
    { day: date(12, 25), id: 'christmas' },
  ];
  if (weekday(date(1, 2)) === 1) list.push({ day: date(1, 2), id: 'newYearBridge' });
  const seventeenth = weekday(date(9, 17));
  if (seventeenth === 1 || seventeenth === 6) {
    list.push({ day: date(9, 17), id: 'independenceBridge' });
  }
  if (weekday(date(9, 20)) === 5) list.push({ day: date(9, 20), id: 'independenceBridge' });
  if (year === 2022) list.push({ day: date(9, 16), id: 'extraSeptember' });
  return list;
}

function brazil(year: number): Holiday[] {
  const easter = easterSunday(year);
  const date = (month: number, day: number) => toEpochDay(year, month, day);
  const list: Holiday[] = [
    { day: date(1, 1), id: 'newYear' },
    { day: easter - 48, id: 'carnival' },
    { day: easter - 47, id: 'carnival' },
    { day: easter - 2, id: 'goodFriday' },
    { day: date(4, 21), id: 'tiradentes' },
    { day: date(5, 1), id: 'labor' },
    { day: easter + 60, id: 'corpusChristi' },
    { day: date(9, 7), id: 'independenceBr' },
    { day: date(10, 12), id: 'aparecida' },
    { day: date(11, 2), id: 'allSouls' },
    { day: date(11, 15), id: 'republic' },
    { day: date(12, 25), id: 'christmas' },
  ];
  if (year >= 2024) list.push({ day: date(11, 20), id: 'blackConsciousness' });
  return list;
}

const cache = new Map<string, Map<number, HolidayId>>();

export function holidaysOf(country: CalendarCountry, year: number): Map<number, HolidayId> {
  const key = `${country}${year}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const list = country === 'CL' ? chile(year) : brazil(year);
  const days = new Map(
    list.sort((a, b) => a.day - b.day).map((holiday) => [holiday.day, holiday.id]),
  );
  cache.set(key, days);
  return days;
}

export function isSupportedYear(year: number): boolean {
  return year >= FIRST_YEAR && year <= LAST_YEAR;
}
