import { defineMessages } from '~/i18n/react';
import type { UnixError } from '~/lib/tools/unix';

export const unixMessages = defineMessages({
  en: {
    zone: 'Time zone',
    unit: 'Input unit',
    show: 'Show',
    now: 'Now',
    inputLabel: 'Timestamps or dates, one per line',
    auto: 'Auto-detect',
    all: 'All formats',
    date: 'date',
    units: { s: 'seconds', ms: 'milliseconds', us: 'microseconds', ns: 'nanoseconds' },
    unitOptions: { s: 'Seconds', ms: 'Milliseconds', us: 'Microseconds', ns: 'Nanoseconds' },
    fields: {
      seconds: 'Seconds',
      milliseconds: 'Milliseconds',
      isoUtc: 'ISO 8601 UTC',
      isoZone: 'ISO 8601 zone',
      rfc2822: 'RFC 2822',
      relative: 'Relative',
      dayOfWeek: 'Day of week',
    },
    error: (error: UnixError, input: string, zone: string) =>
      `${input}  ✘ ${
        error === 'gap'
          ? `does not exist in ${zone} (clocks jump forward)`
          : error === 'out-of-range'
            ? 'out of range'
            : 'not a timestamp or a date'
      }`,
    ambiguous: (zone: string, laterSeconds: string) =>
      `ambiguous in ${zone}; using the earlier offset (later reading: ${laterSeconds} s)`,
    summary: (parsed: number, total: number) => `${parsed} / ${total} parsed`,
  },
  es: {
    zone: 'Zona horaria',
    unit: 'Unidad de entrada',
    show: 'Mostrar',
    now: 'Ahora',
    inputLabel: 'Timestamps o fechas, uno por línea',
    auto: 'Detectar',
    all: 'Todos los formatos',
    date: 'fecha',
    units: { s: 'segundos', ms: 'milisegundos', us: 'microsegundos', ns: 'nanosegundos' },
    unitOptions: { s: 'Segundos', ms: 'Milisegundos', us: 'Microsegundos', ns: 'Nanosegundos' },
    fields: {
      seconds: 'Segundos',
      milliseconds: 'Milisegundos',
      isoUtc: 'ISO 8601 UTC',
      isoZone: 'ISO 8601 zona',
      rfc2822: 'RFC 2822',
      relative: 'Relativo',
      dayOfWeek: 'Día de la semana',
    },
    error: (error: UnixError, input: string, zone: string) =>
      `${input}  ✘ ${
        error === 'gap'
          ? `no existe en ${zone} (los relojes se adelantan)`
          : error === 'out-of-range'
            ? 'fuera de rango'
            : 'no es un timestamp ni una fecha'
      }`,
    ambiguous: (zone: string, laterSeconds: string) =>
      `ambigua en ${zone}; se usa el primer offset (segunda lectura: ${laterSeconds} s)`,
    summary: (parsed: number, total: number) => `${parsed} / ${total} reconocidos`,
  },
});
