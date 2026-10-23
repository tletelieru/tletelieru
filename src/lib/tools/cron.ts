import { Cron } from 'croner';
import cronstrue from 'cronstrue';
import 'cronstrue/locales/es.js';
import type { Locale } from '~/i18n/locales';
import { toIntlLocale } from './time/locale';

export const MAX_RUNS = 50;

const NICKNAMES = new Set([
  '@yearly',
  '@annually',
  '@monthly',
  '@weekly',
  '@daily',
  '@midnight',
  '@hourly',
]);

export type CronError =
  { code: 'empty' } | { code: 'fieldCount'; count: number } | { code: 'invalid'; message: string };

export interface CronInfo {
  expression: string;
  fields: number;
  seconds: boolean;
}

export type CronParseResult = { ok: true; info: CronInfo } | { ok: false; error: CronError };

export function normalizeCron(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

export function parseCron(input: string, timezone = 'UTC'): CronParseResult {
  const expression = normalizeCron(input);
  if (!expression) return { ok: false, error: { code: 'empty' } };
  const nickname = NICKNAMES.has(expression.toLowerCase());
  const count = nickname ? 5 : expression.split(' ').length;
  if (count !== 5 && count !== 6) return { ok: false, error: { code: 'fieldCount', count } };
  try {
    new Cron(expression, { timezone, paused: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message.replace(/^CronPattern: /, '') : String(error);
    return { ok: false, error: { code: 'invalid', message } };
  }
  return { ok: true, info: { expression, fields: count, seconds: count === 6 } };
}

export function describeCron(expression: string, locale: Locale): string {
  try {
    return cronstrue.toString(expression, {
      locale,
      use24HourTimeFormat: true,
      throwExceptionOnParseError: true,
    });
  } catch {
    return '';
  }
}

export function nextRuns(expression: string, timezone: string, from: Date, count = 5): Date[] {
  const runs = Math.min(Math.max(1, Math.trunc(count)), MAX_RUNS);
  return new Cron(expression, { timezone, paused: true }).nextRuns(runs, from);
}

export function formatRun(date: Date, timezone: string, locale: Locale): string {
  const formatted = new Intl.DateTimeFormat(toIntlLocale(locale), {
    timeZone: timezone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  }).format(date);
  return `${formatted}  (${date.toISOString()})`;
}
