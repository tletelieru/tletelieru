import { defineMessages } from '~/i18n/react';

export const smartPasteMessages = defineMessages({
  en: {
    input: 'Paste anything',
    placeholder: 'A RUT, CPF, CNPJ, JSON, HTML, timestamp, date, list of IDs, variableName…',
    empty: 'Paste or type something to see which tools can handle it.',
    noMatch: 'No tool recognized this input. Try the search (Ctrl/⌘ + K) instead.',
    detected: (count: number) => (count === 1 ? '1 matching tool' : `${count} matching tools`),
    open: 'Open',
    confidence: (percent: number) => `${percent}% match`,
    best: 'Best match',
  },
  es: {
    input: 'Pega cualquier cosa',
    placeholder: 'Un RUT, CPF, CNPJ, JSON, HTML, timestamp, fecha, lista de IDs, nombreVariable…',
    empty: 'Pega o escribe algo para ver qué herramientas pueden procesarlo.',
    noMatch: 'Ninguna herramienta reconoció esta entrada. Prueba con la búsqueda (Ctrl/⌘ + K).',
    detected: (count: number) =>
      count === 1 ? '1 herramienta compatible' : `${count} herramientas compatibles`,
    open: 'Abrir',
    confidence: (percent: number) => `${percent}% de coincidencia`,
    best: 'Mejor coincidencia',
  },
});
