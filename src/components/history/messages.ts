import { defineMessages } from '~/i18n/react';

export const historyMessages = defineMessages({
  en: {
    history: 'History',
    historyCount: (count: number) => `History (${count} ${count === 1 ? 'entry' : 'entries'})`,
    clear: 'Clear history',
  },
  es: {
    history: 'Historial',
    historyCount: (count: number) => `Historial (${count} ${count === 1 ? 'entrada' : 'entradas'})`,
    clear: 'Borrar historial',
  },
});
