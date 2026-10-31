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

export const numberFormatMessages = defineMessages({
  en: {
    label: 'Number format',
    formats: { auto: 'Auto', comma: '1.234,56', dot: '1,234.56' },
    ambiguous:
      'The separators are ambiguous here (1.234 could be either format). Pick the number format to be sure.',
  },
  es: {
    label: 'Formato numérico',
    formats: { auto: 'Automático', comma: '1.234,56', dot: '1,234.56' },
    ambiguous:
      'Los separadores son ambiguos aquí (1.234 puede ser cualquiera de los dos formatos). Elige el formato numérico para asegurarte.',
  },
});
