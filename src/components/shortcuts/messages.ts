import { defineMessages } from '~/i18n/react';
import type { ShortcutAction } from '~/lib/shortcuts';

export const shortcutMessages = defineMessages<{
  label: string;
  actions: Record<ShortcutAction, string>;
  copied: string;
  cleared: string;
  swapped: string;
  nothingToCopy: string;
  nothingToMove: string;
  copyFailed: string;
  close: string;
}>({
  en: {
    label: 'Shortcuts',
    actions: { 'copy-output': 'copy output', 'clear-input': 'clear input', swap: 'swap' },
    copied: 'Output copied',
    cleared: 'Input cleared',
    swapped: 'Output moved to input',
    nothingToCopy: 'Nothing to copy',
    nothingToMove: 'The output is empty',
    copyFailed: 'Could not copy to the clipboard',
    close: 'Close',
  },
  es: {
    label: 'Atajos',
    actions: {
      'copy-output': 'copiar resultado',
      'clear-input': 'limpiar entrada',
      swap: 'intercambiar',
    },
    copied: 'Resultado copiado',
    cleared: 'Entrada limpiada',
    swapped: 'Resultado movido a la entrada',
    nothingToCopy: 'No hay nada que copiar',
    nothingToMove: 'El resultado está vacío',
    copyFailed: 'No se pudo copiar al portapapeles',
    close: 'Cerrar',
  },
});
