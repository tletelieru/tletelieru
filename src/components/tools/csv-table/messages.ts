import { defineMessages } from '~/i18n/react';

export const csvTableMessages = defineMessages({
  en: {
    style: 'Table style',
    box: 'Box',
    ascii: 'ASCII',
    markdown: 'Markdown',
    tsv: 'Tabs (TSV)',
    fence: 'Wrap in a code block (Slack)',
    alignNumbers: 'Right-align numbers',
    trimZeros: 'Drop trailing zeros (927.5000 → 927.5)',
    stats: (rows: string, columns: number) =>
      `${rows} · ${columns} ${columns === 1 ? 'column' : 'columns'}`,
  },
  es: {
    style: 'Estilo de tabla',
    box: 'Cuadro',
    ascii: 'ASCII',
    markdown: 'Markdown',
    tsv: 'Tabulaciones (TSV)',
    fence: 'Envolver en bloque de código (Slack)',
    alignNumbers: 'Alinear números a la derecha',
    trimZeros: 'Quitar ceros finales (927.5000 → 927.5)',
    stats: (rows: string, columns: number) =>
      `${rows} · ${columns} ${columns === 1 ? 'columna' : 'columnas'}`,
  },
});
