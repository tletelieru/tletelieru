export interface WallTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

export type LocalResolution =
  | { kind: 'unique'; epochMs: number }
  | { kind: 'ambiguous'; earlierMs: number; laterMs: number }
  | {
      kind: 'gap';
      transitionMs: number;
      offsetBefore: number;
      offsetAfter: number;
      shiftedMs: number;
    };

const MINUTE = 60_000;
const DAY = 86_400_000;

const FALLBACK_ZONES = [
  'UTC',
  'America/Santiago',
  'America/Punta_Arenas',
  'Pacific/Easter',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'America/Lima',
  'America/Bogota',
  'America/Mexico_City',
  'America/Montevideo',
  'America/Guayaquil',
  'America/Caracas',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

const ALWAYS_INCLUDED = ['UTC', 'Asia/Kolkata'];

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(zone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      era: 'short',
    });
    formatterCache.set(zone, formatter);
  }
  return formatter;
}

export function listTimeZones(): string[] {
  const supported =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : FALLBACK_ZONES;
  const zones = new Set(supported.length ? supported : FALLBACK_ZONES);
  for (const zone of ALWAYS_INCLUDED) zones.add(zone);
  return [...zones].sort((a, b) => a.localeCompare(b));
}

export function isValidTimeZone(zone: string): boolean {
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

export function getWallTime(epochMs: number, zone: string): WallTime {
  const values: Record<string, string> = {};
  for (const part of partsFormatter(zone).formatToParts(epochMs)) values[part.type] = part.value;
  const rawYear = Number(values.year);
  const year = values.era === 'BC' || values.era === 'B' ? 1 - rawYear : rawYear;
  return {
    year,
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
    millisecond: ((epochMs % 1000) + 1000) % 1000,
  };
}

export function wallToUtcMs(wall: WallTime): number {
  const date = new Date(0);
  date.setUTCFullYear(wall.year, wall.month - 1, wall.day);
  date.setUTCHours(wall.hour, wall.minute, wall.second, wall.millisecond);
  return date.getTime();
}

export function getOffsetMinutes(epochMs: number, zone: string): number {
  const wholeSecond = epochMs - (((epochMs % 1000) + 1000) % 1000);
  const wall = getWallTime(wholeSecond, zone);
  return Math.round((wallToUtcMs({ ...wall, millisecond: 0 }) - wholeSecond) / MINUTE);
}

export function formatOffset(minutes: number, separator = ':'): string {
  const sign = minutes < 0 ? '-' : '+';
  const absolute = Math.abs(minutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, '0');
  const rest = String(absolute % 60).padStart(2, '0');
  return `${sign}${hours}${separator}${rest}`;
}

const HOUR = 3_600_000;
const offsetLabelCache = new Map<string, { hour: number; label: string }>();

export function zoneOffsetLabel(zone: string, epochMs: number): string {
  const hour = Math.floor(epochMs / HOUR);
  const cached = offsetLabelCache.get(zone);
  if (cached && cached.hour === hour) return cached.label;
  let label: string;
  try {
    label = `UTC${formatOffset(getOffsetMinutes(epochMs, zone))}`;
  } catch {
    label = '';
  }
  offsetLabelCache.set(zone, { hour, label });
  return label;
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

function formatYear(year: number): string {
  if (year >= 0 && year <= 9999) return pad(year, 4);
  return `${year < 0 ? '-' : '+'}${pad(Math.abs(year), 6)}`;
}

export function formatWallTime(wall: WallTime, separator = ' '): string {
  const date = `${formatYear(wall.year)}-${pad(wall.month)}-${pad(wall.day)}`;
  const time = `${pad(wall.hour)}:${pad(wall.minute)}:${pad(wall.second)}`;
  const fraction = wall.millisecond ? `.${pad(wall.millisecond, 3)}` : '';
  return `${date}${separator}${time}${fraction}`;
}

export function formatZonedIso(epochMs: number, zone: string): string {
  const wall = getWallTime(epochMs, zone);
  const offset = getOffsetMinutes(epochMs, zone);
  return `${formatWallTime(wall, 'T')}${offset === 0 && zone === 'UTC' ? 'Z' : formatOffset(offset)}`;
}

export function getAbbreviation(epochMs: number, zone: string): string | null {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    timeZoneName: 'short',
  }).formatToParts(epochMs);
  const name = parts.find((part) => part.type === 'timeZoneName')?.value ?? '';
  if (!name || /^GMT([+-]|$)/.test(name)) return null;
  return name;
}

export function isDst(epochMs: number, zone: string): boolean {
  const year = new Date(epochMs).getUTCFullYear();
  const january = getOffsetMinutes(Date.UTC(year, 0, 1), zone);
  const july = getOffsetMinutes(Date.UTC(year, 6, 1), zone);
  if (january === july) return false;
  return getOffsetMinutes(epochMs, zone) > Math.min(january, july);
}

export function findTransition(startMs: number, endMs: number, zone: string): number | null {
  const startOffset = getOffsetMinutes(startMs, zone);
  if (getOffsetMinutes(endMs, zone) === startOffset) return null;
  let low = startMs;
  let high = endMs;
  while (high - low > 1000) {
    const middle = Math.floor((low + high) / 2);
    if (getOffsetMinutes(middle, zone) === startOffset) low = middle;
    else high = middle;
  }
  return high - (((high % 1000) + 1000) % 1000);
}

export function listTransitions(year: number, zone: string): number[] {
  const result: number[] = [];
  const end = Date.UTC(year + 1, 0, 1);
  for (let start = Date.UTC(year, 0, 1); start < end; start += DAY) {
    const transition = findTransition(start, Math.min(start + DAY, end), zone);
    if (transition !== null) result.push(transition);
  }
  return result;
}

export function resolveLocalTime(wall: WallTime, zone: string): LocalResolution {
  const guess = wallToUtcMs(wall);
  const offsetBefore = getOffsetMinutes(guess - DAY, zone);
  const offsetAfter = getOffsetMinutes(guess + DAY, zone);
  const candidates = [
    ...new Set(
      [offsetBefore, getOffsetMinutes(guess, zone), offsetAfter]
        .map((offset) => guess - offset * MINUTE)
        .filter((candidate) => wallToUtcMs(getWallTime(candidate, zone)) === guess),
    ),
  ].sort((a, b) => a - b);

  if (candidates.length === 1) return { kind: 'unique', epochMs: candidates[0] };
  if (candidates.length > 1) {
    return {
      kind: 'ambiguous',
      earlierMs: candidates[0],
      laterMs: candidates[candidates.length - 1],
    };
  }
  const transitionMs = findTransition(guess - DAY, guess + DAY, zone) ?? guess;
  return {
    kind: 'gap',
    transitionMs,
    offsetBefore,
    offsetAfter,
    shiftedMs: guess - offsetBefore * MINUTE,
  };
}
