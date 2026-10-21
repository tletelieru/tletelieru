import { parseDateTime } from './time/parse';
import {
  formatOffset,
  formatWallTime,
  getAbbreviation,
  getOffsetMinutes,
  getWallTime,
  isDst,
  isValidTimeZone,
  resolveLocalTime,
} from './time/zones';

const MINUTE = 60_000;

export interface ZonedTime {
  zone: string;
  epochMs: number;
  local: string;
  offset: string;
  abbreviation: string | null;
  dst: boolean;
}

export type Reading = 'earlier' | 'later';

export interface Interpretation {
  reading: Reading | null;
  utcIso: string;
  source: ZonedTime;
  targets: ZonedTime[];
}

export type TimezoneConversion =
  | { status: 'empty' }
  | { status: 'invalid-zone'; zone: string }
  | { status: 'invalid-input' }
  | {
      status: 'gap';
      local: string;
      zone: string;
      jumpFrom: string;
      jumpTo: string;
      offsetBefore: string;
      offsetAfter: string;
      suggestion: ZonedTime;
    }
  | { status: 'ok'; kind: 'unique'; interpretations: Interpretation[] }
  | { status: 'ok'; kind: 'explicit-offset'; offset: string; interpretations: Interpretation[] }
  | {
      status: 'ok';
      kind: 'ambiguous';
      local: string;
      zone: string;
      interpretations: Interpretation[];
    };

export interface TableLabels {
  dst: string;
  standard: string;
  reading: (reading: Reading, offset: string) => string;
}

export function parseZoneList(value: string): string[] {
  return [
    ...new Set(
      value
        .split(',')
        .map((zone) => zone.trim())
        .filter(Boolean),
    ),
  ];
}

export function joinZoneList(zones: string[]): string {
  return [...new Set(zones.map((zone) => zone.trim()).filter(Boolean))].join(',');
}

export function describeZonedTime(epochMs: number, zone: string): ZonedTime {
  return {
    zone,
    epochMs,
    local: formatWallTime(getWallTime(epochMs, zone)),
    offset: formatOffset(getOffsetMinutes(epochMs, zone)),
    abbreviation: getAbbreviation(epochMs, zone),
    dst: isDst(epochMs, zone),
  };
}

function interpret(
  epochMs: number,
  source: string,
  targets: string[],
  reading: Reading | null,
): Interpretation {
  return {
    reading,
    utcIso: new Date(epochMs).toISOString(),
    source: describeZonedTime(epochMs, source),
    targets: targets.map((zone) => describeZonedTime(epochMs, zone)),
  };
}

export function convertTimeZones(
  input: string,
  source: string,
  targets: string[],
): TimezoneConversion {
  if (!input.trim()) return { status: 'empty' };
  const invalid = [source, ...targets].find((zone) => !isValidTimeZone(zone));
  if (invalid !== undefined) return { status: 'invalid-zone', zone: invalid };

  const parsed = parseDateTime(input);
  if (!parsed) return { status: 'invalid-input' };
  if (parsed.kind === 'instant') {
    return {
      status: 'ok',
      kind: 'explicit-offset',
      offset: formatOffset(parsed.offsetMinutes),
      interpretations: [interpret(parsed.epochMs, source, targets, null)],
    };
  }

  const resolution = resolveLocalTime(parsed.wall, source);
  const local = formatWallTime(parsed.wall);
  if (resolution.kind === 'gap') {
    return {
      status: 'gap',
      local,
      zone: source,
      jumpFrom: formatWallTime(
        getWallTime(resolution.transitionMs + resolution.offsetBefore * MINUTE, 'UTC'),
      ).slice(0, 16),
      jumpTo: formatWallTime(getWallTime(resolution.transitionMs, source)).slice(11, 16),
      offsetBefore: formatOffset(resolution.offsetBefore),
      offsetAfter: formatOffset(resolution.offsetAfter),
      suggestion: describeZonedTime(resolution.shiftedMs, source),
    };
  }
  if (resolution.kind === 'ambiguous') {
    return {
      status: 'ok',
      kind: 'ambiguous',
      local,
      zone: source,
      interpretations: [
        interpret(resolution.earlierMs, source, targets, 'earlier'),
        interpret(resolution.laterMs, source, targets, 'later'),
      ],
    };
  }
  return {
    status: 'ok',
    kind: 'unique',
    interpretations: [interpret(resolution.epochMs, source, targets, null)],
  };
}

function formatRow(time: ZonedTime, labels: TableLabels): string[] {
  return [
    time.zone,
    time.local,
    time.offset,
    time.abbreviation ?? '-',
    time.dst ? labels.dst : labels.standard,
  ];
}

function table(rows: string[][]): string {
  const widths = rows[0].map((_, column) => Math.max(...rows.map((row) => row[column].length)));
  return rows
    .map((row) =>
      row
        .map((cell, column) => (column === row.length - 1 ? cell : cell.padEnd(widths[column])))
        .join('  '),
    )
    .join('\n');
}

export function formatInterpretation(interpretation: Interpretation, labels: TableLabels): string {
  const header = interpretation.reading
    ? `${labels.reading(interpretation.reading, interpretation.source.offset)}\n`
    : '';
  const rows = [interpretation.source, ...interpretation.targets].map((time) =>
    formatRow(time, labels),
  );
  return `${header}${table(rows)}`;
}

export function formatConversion(result: TimezoneConversion, labels: TableLabels): string {
  if (result.status !== 'ok') return '';
  return result.interpretations.map((item) => formatInterpretation(item, labels)).join('\n\n');
}

export interface SwapResult {
  input: string;
  source: string;
  targets: string[];
}

export function swapZones(input: string, source: string, targets: string[]): SwapResult {
  if (!targets.length) return { input, source, targets };
  const [first, ...rest] = targets;
  const result = convertTimeZones(input, source, [first]);
  const converted =
    result.status === 'ok' && result.kind === 'unique'
      ? result.interpretations[0].targets[0].local
      : input;
  return {
    input: converted,
    source: first,
    targets: [source, ...rest.filter((zone) => zone !== source)],
  };
}

export function nowInZone(nowMs: number, zone: string): string {
  return formatWallTime({ ...getWallTime(nowMs, zone), millisecond: 0 });
}
