import { defineMessages } from '~/i18n/react';

export const textDiffMessages = defineMessages({
  en: {
    original: 'Original',
    changed: 'Changed',
    view: 'View',
    split: 'Side by side',
    unified: 'Unified',
    ignoreWhitespace: 'Ignore whitespace',
    ignoreCase: 'Ignore case',
    patch: 'Unified diff',
    visual: 'Line diff',
    identical: 'No differences.',
    counts: (added: number, removed: number) => `+${added} added · −${removed} removed`,
  },
  es: {
    original: 'Original',
    changed: 'Modificado',
    view: 'Vista',
    split: 'Lado a lado',
    unified: 'Unificada',
    ignoreWhitespace: 'Ignorar espacios',
    ignoreCase: 'Ignorar mayúsculas',
    patch: 'Diff unificado',
    visual: 'Diferencias por línea',
    identical: 'Sin diferencias.',
    counts: (added: number, removed: number) => `+${added} agregadas · −${removed} eliminadas`,
  },
});
