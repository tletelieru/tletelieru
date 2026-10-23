import { defineMessages } from '~/i18n/react';
import type { CsvParseError } from '~/lib/tools/csv';
import type { CsvInsertError } from '~/lib/tools/csv-insert';
import { previewValues } from '~/lib/tools/sql/format';

function listRows(rows: readonly number[], and: string, more: string): string {
  const { shown, hidden } = previewValues(rows.map(String));
  const text = shown.join(', ');
  return hidden ? `${text} ${and} ${hidden} ${more}` : text;
}

export const csvInsertMessages = defineMessages({
  en: {
    table: 'Table',
    statements: 'Statements',
    multiRow: 'One multi-row INSERT',
    perRow: 'One INSERT per row',
    rowsPerInsert: 'Rows per INSERT (0 = all)',
    identifiers: 'Column quoting',
    identAuto: 'Auto',
    identNone: 'No quotes',
    nullEmpty: 'Empty cells as NULL',
    inferSql: 'Unquote numbers, booleans and null',
    error: (error: CsvInsertError, csvError: (inner: CsvParseError) => string): string => {
      switch (error.code) {
        case 'tableRequired':
          return 'Table name is required.';
        case 'invalidTable':
          return `Invalid table name: ${error.table}`;
        case 'csv':
          return csvError(error.error);
        case 'raggedRows':
          return `Rows with a different number of cells (missing cells are filled, extra cells dropped): line ${listRows(error.rows, 'and', 'more')}`;
      }
    },
  },
  es: {
    table: 'Tabla',
    statements: 'Sentencias',
    multiRow: 'Un INSERT con varias filas',
    perRow: 'Un INSERT por fila',
    rowsPerInsert: 'Filas por INSERT (0 = todas)',
    identifiers: 'Comillas en columnas',
    identAuto: 'Automático',
    identNone: 'Sin comillas',
    nullEmpty: 'Celdas vacías como NULL',
    inferSql: 'Números, booleanos y null sin comillas',
    error: (error: CsvInsertError, csvError: (inner: CsvParseError) => string): string => {
      switch (error.code) {
        case 'tableRequired':
          return 'El nombre de la tabla es obligatorio.';
        case 'invalidTable':
          return `Nombre de tabla inválido: ${error.table}`;
        case 'csv':
          return csvError(error.error);
        case 'raggedRows':
          return `Filas con otra cantidad de celdas (las faltantes se completan y las sobrantes se descartan): línea ${listRows(error.rows, 'y', 'más')}`;
      }
    },
  },
});
