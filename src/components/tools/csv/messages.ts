import { defineMessages } from '~/i18n/react';
import type { CsvParseError } from '~/lib/tools/csv';

export const csvMessages = defineMessages({
  en: {
    delimiter: 'Delimiter',
    auto: 'Auto',
    comma: 'Comma',
    semicolon: 'Semicolon',
    tab: 'Tab',
    header: 'First row is a header',
    infer: 'Infer types (numbers, booleans, null)',
    rows: (count: number) => `${count} ${count === 1 ? 'row' : 'rows'}`,
    csvError: (error: CsvParseError): string => {
      switch (error.code) {
        case 'unterminatedQuote':
          return `Line ${error.line}: the quoted field that starts here is never closed`;
        case 'textAfterQuote':
          return `Line ${error.line}, column ${error.column}: unexpected text after a closing quote`;
      }
    },
  },
  es: {
    delimiter: 'Separador',
    auto: 'Automático',
    comma: 'Coma',
    semicolon: 'Punto y coma',
    tab: 'Tabulador',
    header: 'La primera fila es el encabezado',
    infer: 'Inferir tipos (números, booleanos, null)',
    rows: (count: number) => `${count} ${count === 1 ? 'fila' : 'filas'}`,
    csvError: (error: CsvParseError): string => {
      switch (error.code) {
        case 'unterminatedQuote':
          return `Línea ${error.line}: el campo entre comillas que empieza aquí nunca se cierra`;
        case 'textAfterQuote':
          return `Línea ${error.line}, columna ${error.column}: texto inesperado después de una comilla de cierre`;
      }
    },
  },
});
