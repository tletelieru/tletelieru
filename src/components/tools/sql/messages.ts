import { defineMessages } from '~/i18n/react';
import { previewValues, type SqlToolError } from '~/lib/tools/sql/format';
import type { ValueStats } from '~/lib/tools/sql/values';

function listed(values: readonly string[], and: string, more: string): string {
  const { shown, hidden } = previewValues(values);
  const text = shown.map((value) => `"${value}"`).join(', ');
  return hidden ? `${text} ${and} ${hidden} ${more}` : text;
}

export const sqlMessages = defineMessages({
  en: {
    values: 'Values',
    column: 'Column',
    columnOptional: 'Column (optional)',
    splitOn: 'Split on',
    anySeparator: 'Any separator',
    newlinesOnly: 'Newlines only',
    quoteStyle: 'Quote style',
    singleQuotes: 'Single quotes',
    doubleQuotes: 'Double quotes',
    backticks: 'Backticks',
    noQuotes: 'No quotes',
    none: 'none',
    layout: 'Layout',
    singleLine: 'Single line',
    onePerLine: 'One per line',
    batchSize: 'Batch size (0 = none)',
    removeDuplicates: 'Remove duplicates',
    stripQuotes: 'Strip existing quotes',
    escapeQuotes: "Escape quotes (' → '')",
    uppercase: 'Uppercase keywords',
    stats: ({ total, unique, duplicatesRemoved }: ValueStats) =>
      `${total} ${total === 1 ? 'value' : 'values'} · ${unique} unique · ${duplicatesRemoved} duplicates removed`,
    error: (error: SqlToolError): string => {
      switch (error.code) {
        case 'columnRequired':
          return 'Column name is required.';
        case 'invalidColumn':
          return `Invalid column name: ${error.column}`;
        case 'pathRequired':
          return 'Key path is required.';
        case 'invalidPath':
          return `Invalid key path: ${error.path} (use dot notation like nested.key)`;
        case 'invalidNumbers':
          return `Skipped ${error.values.length} invalid ${
            error.values.length === 1 ? 'value' : 'values'
          }: ${listed(error.values, 'and', 'more')}`;
      }
    },
  },
  es: {
    values: 'Valores',
    column: 'Columna',
    columnOptional: 'Columna (opcional)',
    splitOn: 'Separar por',
    anySeparator: 'Cualquier separador',
    newlinesOnly: 'Solo saltos de línea',
    quoteStyle: 'Tipo de comillas',
    singleQuotes: 'Comillas simples',
    doubleQuotes: 'Comillas dobles',
    backticks: 'Backticks',
    noQuotes: 'Sin comillas',
    none: 'ninguna',
    layout: 'Diseño',
    singleLine: 'Una línea',
    onePerLine: 'Uno por línea',
    batchSize: 'Tamaño de lote (0 = sin lotes)',
    removeDuplicates: 'Quitar duplicados',
    stripQuotes: 'Quitar comillas existentes',
    escapeQuotes: "Escapar comillas (' → '')",
    uppercase: 'Palabras clave en mayúsculas',
    stats: ({ total, unique, duplicatesRemoved }: ValueStats) =>
      `${total} ${total === 1 ? 'valor' : 'valores'} · ${unique} únicos · ${duplicatesRemoved} duplicados eliminados`,
    error: (error: SqlToolError): string => {
      switch (error.code) {
        case 'columnRequired':
          return 'El nombre de la columna es obligatorio.';
        case 'invalidColumn':
          return `Nombre de columna inválido: ${error.column}`;
        case 'pathRequired':
          return 'La ruta de la clave es obligatoria.';
        case 'invalidPath':
          return `Ruta de clave inválida: ${error.path} (usa notación con puntos, como nested.key)`;
        case 'invalidNumbers':
          return `Se omitieron ${error.values.length} ${
            error.values.length === 1 ? 'valor inválido' : 'valores inválidos'
          }: ${listed(error.values, 'y', 'más')}`;
      }
    },
  },
});

export type SqlMessages = (typeof sqlMessages)['en'];
