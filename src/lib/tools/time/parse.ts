import { wallToUtcMs, type WallTime } from './zones';

export type ParsedDateTime =
  { kind: 'wall'; wall: WallTime } | { kind: 'instant'; epochMs: number; offsetMinutes: number };

const PATTERN =
  /^([+-]\d{6}|\d{4})-(\d{2})-(\d{2})(?:(?:T|\s+)(\d{2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?)?\s*(Z|UTC|GMT|[+-]\d{2}(?::?\d{2})?)?$/i;

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  return month === 2 && isLeap(year) ? 29 : MONTH_DAYS[month - 1];
}

function parseOffset(raw: string): number {
  const upper = raw.toUpperCase();
  if (upper === 'Z' || upper === 'UTC' || upper === 'GMT') return 0;
  const sign = raw.startsWith('-') ? -1 : 1;
  const digits = raw.slice(1).replace(':', '');
  const hours = Number(digits.slice(0, 2));
  const minutes = digits.length > 2 ? Number(digits.slice(2, 4)) : 0;
  if (hours > 23 || minutes > 59) return Number.NaN;
  return sign * (hours * 60 + minutes);
}

export function parseDateTime(input: string): ParsedDateTime | null {
  const match = PATTERN.exec(input.trim());
  if (!match) return null;
  const [, y, mo, d, h = '0', mi = '0', s = '0', fraction = '', offsetRaw] = match;
  const wall: WallTime = {
    year: Number(y),
    month: Number(mo),
    day: Number(d),
    hour: Number(h),
    minute: Number(mi),
    second: Number(s),
    millisecond: Number(fraction.padEnd(3, '0').slice(0, 3)),
  };
  if (wall.month < 1 || wall.month > 12) return null;
  if (wall.day < 1 || wall.day > daysInMonth(wall.year, wall.month)) return null;
  if (wall.hour > 23 || wall.minute > 59 || wall.second > 59) return null;
  if (!offsetRaw) return { kind: 'wall', wall };
  const offsetMinutes = parseOffset(offsetRaw);
  if (Number.isNaN(offsetMinutes)) return null;
  return { kind: 'instant', epochMs: wallToUtcMs(wall) - offsetMinutes * 60_000, offsetMinutes };
}
