import {
  formatEpochDay,
  holidaysOf,
  isSupportedYear,
  toEpochDay,
  weekday,
  yearOf,
  type CalendarCountry,
  type Holiday,
} from './holidays';

export const businessModes = ['add', 'count'] as const;
export type BusinessMode = (typeof businessModes)[number];

export type BusinessError = 'date' | 'pair' | 'range';

const MAX_STEPS = 6000;

export function parseCalendarDate(text: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const [year, month, date] = match.slice(1).map(Number) as [number, number, number];
  const day = toEpochDay(year, month, date);
  return formatEpochDay(day) === text.trim() ? day : null;
}

function isWeekend(day: number): boolean {
  const current = weekday(day);
  return current === 0 || current === 6;
}

function holidayOn(country: CalendarCountry, day: number): Holiday | null {
  const id = holidaysOf(country, yearOf(day)).get(day);
  return id ? { day, id } : null;
}

export function isBusinessDay(country: CalendarCountry, day: number): boolean {
  return !isWeekend(day) && !holidayOn(country, day);
}

export type AddResult = { ok: true; day: number; skipped: Holiday[] } | { ok: false };

export function addBusinessDays(
  country: CalendarCountry,
  start: number,
  amount: number,
): AddResult {
  if (!isSupportedYear(yearOf(start)) || Math.abs(amount) > MAX_STEPS) return { ok: false };
  const step = amount < 0 ? -1 : 1;
  const skipped: Holiday[] = [];
  let day = start;
  let remaining = Math.abs(amount);
  while (remaining > 0) {
    day += step;
    if (!isSupportedYear(yearOf(day))) return { ok: false };
    const holiday = holidayOn(country, day);
    if (holiday && !isWeekend(day)) skipped.push(holiday);
    if (!holiday && !isWeekend(day)) remaining--;
  }
  return { ok: true, day, skipped };
}

export type CountResult =
  { ok: true; business: number; calendar: number; holidays: Holiday[] } | { ok: false };

export function countBusinessDays(
  country: CalendarCountry,
  from: number,
  to: number,
  includeStart: boolean,
): CountResult {
  if (!isSupportedYear(yearOf(from)) || !isSupportedYear(yearOf(to))) return { ok: false };
  const first = Math.min(from, to);
  const last = Math.max(from, to);
  const sign = from <= to ? 1 : -1;
  const holidays: Holiday[] = [];
  let business = 0;
  for (let day = includeStart ? first : first + 1; day <= last; day++) {
    const holiday = holidayOn(country, day);
    if (holiday && !isWeekend(day)) holidays.push(holiday);
    if (!holiday && !isWeekend(day)) business++;
  }
  return { ok: true, business: sign * business, calendar: sign * (last - first), holidays };
}

export type BusinessLine =
  | { ok: true; kind: 'add'; start: number; amount: number; day: number; skipped: Holiday[] }
  | {
      ok: true;
      kind: 'count';
      from: number;
      to: number;
      business: number;
      calendar: number;
      holidays: Holiday[];
    }
  | { ok: false; line: number; text: string; error: BusinessError };

export interface BusinessOptions {
  mode: BusinessMode;
  country: CalendarCountry;
  days: number;
  includeStart: boolean;
}

function processLine(text: string, line: number, options: BusinessOptions): BusinessLine {
  const failure = (error: BusinessError): BusinessLine => ({ ok: false, line, text, error });
  if (options.mode === 'add') {
    const start = parseCalendarDate(text);
    if (start === null) return failure('date');
    const added = addBusinessDays(options.country, start, options.days);
    if (!added.ok) return failure('range');
    return { ...added, kind: 'add', start, amount: options.days };
  }
  const parts = text.split(/[\s,;]+/).filter((part) => part !== '→' && part !== '->');
  if (parts.length !== 2) return failure('pair');
  const from = parseCalendarDate(parts[0] ?? '');
  const to = parseCalendarDate(parts[1] ?? '');
  if (from === null || to === null) return failure('date');
  const counted = countBusinessDays(options.country, from, to, options.includeStart);
  if (!counted.ok) return failure('range');
  return { ...counted, kind: 'count', from, to };
}

export function processBusinessDays(input: string, options: BusinessOptions): BusinessLine[] {
  return input.split(/\r?\n/).flatMap((raw, index) => {
    const text = raw.trim();
    return text === '' ? [] : [processLine(text, index + 1, options)];
  });
}
