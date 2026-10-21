import { nonEmptyLines } from './_shared/lines';
import { toIntlLocale } from './time/locale';
import { parseDateTime } from './time/parse';
import {
  formatOffset,
  formatZonedIso,
  getOffsetMinutes,
  getWallTime,
  isValidTimeZone,
  resolveLocalTime,
} from './time/zones';

export const timestampUnits = ['s', 'ms', 'us', 'ns'] as const;
export type TimestampUnit = (typeof timestampUnits)[number];
export type UnitOption = 'auto' | TimestampUnit;

export const unixFields = [
  'seconds',
  'milliseconds',
  'isoUtc',
  'isoZone',
  'rfc2822',
  'relative',
  'dayOfWeek',
] as const;
export type UnixField = (typeof unixFields)[number];
export type UnixDetails = Record<UnixField, string>;

export type UnixError = 'out-of-range' | 'unrecognized' | 'gap';

export type UnixLine =
  | {
      ok: true;
      input: string;
      unit: TimestampUnit | null;
      epochMs: number;
      ambiguousLaterMs: number | null;
      details: UnixDetails;
    }
  | { ok: false; input: string; error: UnixError };

export interface UnixOptions {
  unit?: UnitOption;
  zone?: string;
  now: number;
  locale?: string;
}

export interface UnixLabels {
  fields: Record<UnixField, string>;
  units: Record<TimestampUnit, string>;
  date: string;
  error: (error: UnixError, input: string, zone: string) => string;
  ambiguous: (zone: string, laterSeconds: string) => string;
}

const MAX_MS = 8.64e15;
const NUMERIC = /^([+-]?)(\d+)(?:\.(\d+))?$/;
const UNIT_EXPONENT: Record<TimestampUnit, number> = { s: 9, ms: 6, us: 3, ns: 0 };
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000_000],
  ['month', 2_592_000_000],
  ['week', 604_800_000],
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
  ['second', 1000],
];

export function detectUnit(integerDigits: string): TimestampUnit {
  const length = integerDigits.replace(/^0+/, '').length;
  if (length <= 11) return 's';
  if (length <= 14) return 'ms';
  if (length <= 17) return 'us';
  return 'ns';
}

function floorDiv(value: bigint, divisor: bigint): bigint {
  const quotient = value / divisor;
  return value % divisor !== 0n && value < 0n ? quotient - 1n : quotient;
}

function cleanNumeric(raw: string): string {
  return raw.trim().replace(/[_\s]/g, '');
}

export function parseTimestamp(
  raw: string,
  unitOption: UnitOption = 'auto',
): { epochMs: number; unit: TimestampUnit } | null {
  const match = NUMERIC.exec(cleanNumeric(raw));
  if (!match) return null;
  const [, sign, integer, fraction = ''] = match;
  const unit = unitOption === 'auto' ? detectUnit(integer) : unitOption;
  const exponent = UNIT_EXPONENT[unit];
  const scaled = `${integer}${fraction.padEnd(exponent, '0').slice(0, exponent)}`;
  const nanoseconds = BigInt(scaled) * (sign === '-' ? -1n : 1n);
  const milliseconds = floorDiv(nanoseconds, 1_000_000n);
  if (milliseconds > BigInt(MAX_MS) || milliseconds < -BigInt(MAX_MS)) return null;
  return { epochMs: Number(milliseconds), unit };
}

export function formatRelative(epochMs: number, now: number, locale = 'en'): string {
  const formatter = new Intl.RelativeTimeFormat(toIntlLocale(locale), { numeric: 'auto' });
  const diff = epochMs - now;
  const absolute = Math.abs(diff);
  const match = RELATIVE_UNITS.find(([, size]) => absolute >= size);
  if (!match) return formatter.format(0, 'second');
  const [unit, size] = match;
  return formatter.format(Math.round(diff / size), unit);
}

export function formatDayOfWeek(epochMs: number, zone: string, locale = 'en'): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), { weekday: 'long', timeZone: zone }).format(
    epochMs,
  );
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

export function formatRfc2822(epochMs: number, zone = 'UTC'): string {
  const wall = getWallTime(epochMs, zone);
  const offset = formatOffset(getOffsetMinutes(epochMs, zone), '');
  const date = new Date(0);
  date.setUTCFullYear(wall.year, wall.month - 1, wall.day);
  const weekday = WEEKDAYS[date.getUTCDay()];
  const time = `${pad(wall.hour)}:${pad(wall.minute)}:${pad(wall.second)}`;
  return `${weekday}, ${pad(wall.day)} ${MONTHS[wall.month - 1]} ${wall.year} ${time} ${offset}`;
}

export function describeInstant(
  epochMs: number,
  zone: string,
  now: number,
  locale = 'en',
): UnixDetails {
  return {
    seconds: String(Math.floor(epochMs / 1000)),
    milliseconds: String(epochMs),
    isoUtc: new Date(epochMs).toISOString(),
    isoZone: formatZonedIso(epochMs, zone),
    rfc2822: formatRfc2822(epochMs, zone),
    relative: formatRelative(epochMs, now, locale),
    dayOfWeek: formatDayOfWeek(epochMs, zone, locale),
  };
}

const EXPLICIT_ZONE = /(?:\bGMT|\bUTC|\bZ|[+-]\d{2}:?\d{2})\s*$/i;

function parseDateInput(
  raw: string,
  zone: string,
): { epochMs: number; ambiguousLaterMs: number | null } | { error: UnixError } {
  const parsed = parseDateTime(raw);
  if (parsed?.kind === 'instant') return { epochMs: parsed.epochMs, ambiguousLaterMs: null };
  if (parsed?.kind === 'wall') {
    const resolution = resolveLocalTime(parsed.wall, zone);
    if (resolution.kind === 'unique')
      return { epochMs: resolution.epochMs, ambiguousLaterMs: null };
    if (resolution.kind === 'gap') return { error: 'gap' };
    return { epochMs: resolution.earlierMs, ambiguousLaterMs: resolution.laterMs };
  }
  if (EXPLICIT_ZONE.test(raw)) {
    const epochMs = Date.parse(raw);
    if (Number.isFinite(epochMs)) return { epochMs, ambiguousLaterMs: null };
  }
  return { error: 'unrecognized' };
}

export function convertUnixLine(
  raw: string,
  { unit = 'auto', zone = 'UTC', now, locale = 'en' }: UnixOptions,
): UnixLine {
  const input = raw.trim();
  const timeZone = isValidTimeZone(zone) ? zone : 'UTC';
  if (NUMERIC.test(cleanNumeric(input))) {
    const parsed = parseTimestamp(input, unit);
    if (!parsed) return { ok: false, input, error: 'out-of-range' };
    return {
      ok: true,
      input,
      unit: parsed.unit,
      epochMs: parsed.epochMs,
      ambiguousLaterMs: null,
      details: describeInstant(parsed.epochMs, timeZone, now, locale),
    };
  }
  const parsed = parseDateInput(input, timeZone);
  if ('error' in parsed) return { ok: false, input, error: parsed.error };
  return {
    ok: true,
    input,
    unit: null,
    epochMs: parsed.epochMs,
    ambiguousLaterMs: parsed.ambiguousLaterMs,
    details: describeInstant(parsed.epochMs, timeZone, now, locale),
  };
}

export function convertUnix(input: string, options: UnixOptions): UnixLine[] {
  return nonEmptyLines(input).map((line) => convertUnixLine(line, options));
}

function formatBlock(line: UnixLine, zone: string, labels: UnixLabels): string {
  if (!line.ok) return labels.error(line.error, line.input, zone);
  const heading = `${line.input}  (${line.unit ? labels.units[line.unit] : labels.date})`;
  const width = Math.max(...unixFields.map((field) => labels.fields[field].length));
  const rows = unixFields.map((field) => {
    const suffix = field === 'isoZone' ? `  ${zone}` : '';
    return `  ${labels.fields[field].padEnd(width)}  ${line.details[field]}${suffix}`;
  });
  const note =
    line.ambiguousLaterMs === null
      ? []
      : [`  ! ${labels.ambiguous(zone, String(Math.floor(line.ambiguousLaterMs / 1000)))}`];
  return [heading, ...rows, ...note].join('\n');
}

export function formatUnixOutput(
  lines: UnixLine[],
  field: UnixField | 'all',
  zone: string,
  labels: UnixLabels,
): string {
  if (field === 'all') return lines.map((line) => formatBlock(line, zone, labels)).join('\n\n');
  return lines
    .map((line) => (line.ok ? line.details[field] : labels.error(line.error, line.input, zone)))
    .join('\n');
}
