import { defineMessages } from '~/i18n/react';
import type { Reading } from '~/lib/tools/timezone';

export const timezoneMessages = defineMessages({
  en: {
    from: 'From',
    to: 'To',
    swap: 'Swap',
    now: 'Now',
    inputLabel: 'Date and time',
    inputHelp: 'YYYY-MM-DD HH:mm[:ss] in the source zone, or ISO 8601 with an offset',
    dst: 'DST',
    standard: 'standard',
    reading: (reading: Reading, offset: string) =>
      `${reading === 'earlier' ? 'Earlier' : 'Later'} (${offset})`,
    invalidInput:
      'Unrecognized date-time. Use YYYY-MM-DD HH:mm[:ss] or ISO 8601 (with or without offset).',
    invalidZone: (zone: string) => `Unknown time zone: ${zone}`,
    explicitOffset: (offset: string) =>
      `Input has an explicit offset (${offset}); the source zone is only used for display.`,
    ambiguous: (local: string, zone: string) =>
      `${local} happens twice in ${zone} (clocks fall back). Both readings are shown.`,
    gap: (
      local: string,
      zone: string,
      jumpFrom: string,
      before: string,
      jumpTo: string,
      after: string,
      suggestion: string,
    ) =>
      `${local} does not exist in ${zone}: at ${jumpFrom} (${before}) clocks jump forward to ${jumpTo} (${after}). Did you mean ${suggestion}?`,
  },
  es: {
    from: 'Desde',
    to: 'Hacia',
    swap: 'Invertir',
    now: 'Ahora',
    inputLabel: 'Fecha y hora',
    inputHelp: 'YYYY-MM-DD HH:mm[:ss] en la zona de origen, o ISO 8601 con offset',
    dst: 'horario de verano',
    standard: 'horario estándar',
    reading: (reading: Reading, offset: string) =>
      `${reading === 'earlier' ? 'Primera' : 'Segunda'} (${offset})`,
    invalidInput:
      'Fecha y hora no reconocida. Usa YYYY-MM-DD HH:mm[:ss] o ISO 8601 (con o sin offset).',
    invalidZone: (zone: string) => `Zona horaria desconocida: ${zone}`,
    explicitOffset: (offset: string) =>
      `La entrada tiene un offset explícito (${offset}); la zona de origen solo se usa para mostrarla.`,
    ambiguous: (local: string, zone: string) =>
      `${local} ocurre dos veces en ${zone} (los relojes se atrasan). Se muestran ambas lecturas.`,
    gap: (
      local: string,
      zone: string,
      jumpFrom: string,
      before: string,
      jumpTo: string,
      after: string,
      suggestion: string,
    ) =>
      `${local} no existe en ${zone}: a las ${jumpFrom} (${before}) los relojes se adelantan a las ${jumpTo} (${after}). ¿Quisiste decir ${suggestion}?`,
  },
});
