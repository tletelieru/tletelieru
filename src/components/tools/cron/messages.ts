import { defineMessages } from '~/i18n/react';
import type { CronError } from '~/lib/tools/cron';

export const cronMessages = defineMessages({
  en: {
    expression: 'Cron expression',
    zone: 'Time zone',
    count: 'Number of runs',
    now: 'Recalculate from now',
    runsLabel: 'Next runs',
    withSeconds: '6 fields (with seconds)',
    standard: '5 fields',
    error: (error: CronError): string => {
      switch (error.code) {
        case 'empty':
          return 'Enter a cron expression.';
        case 'fieldCount':
          return `Expected 5 fields (minute hour day month weekday) or 6 with seconds first; found ${error.count}.`;
        case 'invalid':
          return `Invalid expression: ${error.message}`;
      }
    },
  },
  es: {
    expression: 'Expresión cron',
    zone: 'Zona horaria',
    count: 'Cantidad de ejecuciones',
    now: 'Recalcular desde ahora',
    runsLabel: 'Próximas ejecuciones',
    withSeconds: '6 campos (con segundos)',
    standard: '5 campos',
    error: (error: CronError): string => {
      switch (error.code) {
        case 'empty':
          return 'Escribe una expresión cron.';
        case 'fieldCount':
          return `Se esperaban 5 campos (minuto hora día mes día-de-semana) o 6 con los segundos primero; hay ${error.count}.`;
        case 'invalid':
          return `Expresión inválida: ${error.message}`;
      }
    },
  },
});
