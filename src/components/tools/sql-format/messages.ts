import { defineMessages } from '~/i18n/react';
import type { SqlFormatError } from '~/lib/tools/sql-format';

export const sqlFormatMessages = defineMessages({
  en: {
    dialect: 'Dialect',
    standard: 'Standard SQL',
    keywordCase: 'Keyword case',
    upper: 'UPPER',
    lower: 'lower',
    preserve: 'Preserve',
    indent: 'Indent',
    spaces: (count: number) => `${count} spaces`,
    tab: 'Tab',
    minify: 'Minify (one line, no comments)',
    error: (error: SqlFormatError) =>
      error.line === null
        ? 'Could not parse the SQL.'
        : `Line ${error.line}, column ${error.column}: could not parse the SQL here.`,
  },
  es: {
    dialect: 'Dialecto',
    standard: 'SQL estándar',
    keywordCase: 'Mayúsculas en palabras clave',
    upper: 'MAYÚSCULAS',
    lower: 'minúsculas',
    preserve: 'Mantener',
    indent: 'Indentación',
    spaces: (count: number) => `${count} espacios`,
    tab: 'Tabulador',
    minify: 'Minificar (una línea, sin comentarios)',
    error: (error: SqlFormatError) =>
      error.line === null
        ? 'No se pudo interpretar el SQL.'
        : `Línea ${error.line}, columna ${error.column}: no se pudo interpretar el SQL aquí.`,
  },
});
