import { defineMessages } from '~/i18n/react';

export const jsonDiffMessages = defineMessages({
  en: {
    left: 'Original JSON',
    right: 'Changed JSON',
    arrays: 'Arrays',
    byIndex: 'By index',
    asSet: 'As sets',
    changes: 'Changes',
    identical: 'Both documents are equal.',
    side: (side: 'left' | 'right'): string => (side === 'left' ? 'Original JSON' : 'Changed JSON'),
    counts: (added: number, removed: number, changed: number) =>
      `+${added} added · −${removed} removed · ~${changed} changed`,
  },
  es: {
    left: 'JSON original',
    right: 'JSON modificado',
    arrays: 'Arreglos',
    byIndex: 'Por índice',
    asSet: 'Como conjuntos',
    changes: 'Cambios',
    identical: 'Ambos documentos son iguales.',
    side: (side: 'left' | 'right'): string =>
      side === 'left' ? 'JSON original' : 'JSON modificado',
    counts: (added: number, removed: number, changed: number) =>
      `+${added} agregados · −${removed} eliminados · ~${changed} modificados`,
  },
});
