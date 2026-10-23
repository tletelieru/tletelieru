import { defineMessages } from '~/i18n/react';

export const csvJsonMessages = defineMessages({
  en: {
    mode: 'Direction',
    csv2json: 'CSV → JSON',
    json2csv: 'JSON → CSV',
    pretty: 'Pretty print',
    notTabular: 'JSON must be an object, an array of objects or an array of arrays.',
    stats: (rows: string, columns: number) =>
      `${rows} · ${columns} ${columns === 1 ? 'column' : 'columns'}`,
  },
  es: {
    mode: 'Dirección',
    csv2json: 'CSV → JSON',
    json2csv: 'JSON → CSV',
    pretty: 'Formato legible',
    notTabular: 'El JSON debe ser un objeto, un arreglo de objetos o un arreglo de arreglos.',
    stats: (rows: string, columns: number) =>
      `${rows} · ${columns} ${columns === 1 ? 'columna' : 'columnas'}`,
  },
});
