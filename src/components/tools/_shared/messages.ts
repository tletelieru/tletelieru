import { defineMessages } from '~/i18n/react';

export const sharedMessages = defineMessages({
  en: {
    input: 'Input',
    output: 'Output',
    copy: 'Copy',
    copied: 'Copied',
    paste: 'Paste',
    pasteDenied: 'Clipboard access was blocked. Paste with Ctrl/⌘ + V instead.',
    unknownTool: (slug: string) => `Unknown tool: ${slug}`,
    unknownFeature: (name: string) => `Unknown feature: ${name}`,
  },
  es: {
    input: 'Entrada',
    output: 'Resultado',
    copy: 'Copiar',
    copied: 'Copiado',
    paste: 'Pegar',
    pasteDenied: 'El navegador bloqueó el acceso al portapapeles. Pega con Ctrl/⌘ + V.',
    unknownTool: (slug: string) => `Herramienta desconocida: ${slug}`,
    unknownFeature: (name: string) => `Función desconocida: ${name}`,
  },
});
