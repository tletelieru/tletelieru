import { defineMessages } from '~/i18n/react';
import type { JsonUnescapeErrorCode } from '~/lib/tools/json-escape';

export const jsonEscapeMessages = defineMessages({
  en: {
    mode: 'Mode',
    escape: 'Escape',
    unescape: 'Unescape',
    quotes: 'Wrap in quotes',
    asciiOnly: 'Escape non-ASCII as \\uXXXX',
    escapeInput: 'Raw text',
    unescapeInput: 'JSON string (with or without quotes)',
    prettyJson: 'Pretty-print embedded JSON',
    rawText: 'Show raw text',
    embeddedJson: 'The unescaped text is JSON.',
    escapes: (count: number) => `${count} ${count === 1 ? 'escape' : 'escapes'}`,
    error: (code: JsonUnescapeErrorCode, sequence: string, line: number, column: number) => {
      const where = `line ${line}, column ${column}`;
      switch (code) {
        case 'invalid-escape':
          return `Invalid escape ${sequence} at ${where}.`;
        case 'incomplete-escape':
          return `The text ends with an unfinished escape at ${where}.`;
        case 'invalid-unicode':
          return `Invalid unicode escape ${sequence} at ${where}: expected \\u and 4 hex digits.`;
        case 'lone-surrogate':
          return `Lone surrogate ${sequence} at ${where}: a high surrogate must be followed by a low one.`;
        case 'unescaped-quote':
          return `Unescaped quote at ${where}: use \\" inside a quoted string.`;
        case 'control-char':
          return `Raw control character at ${where}: use \\n, \\t or \\uXXXX inside a quoted string.`;
      }
    },
  },
  es: {
    mode: 'Modo',
    escape: 'Escapar',
    unescape: 'Desescapar',
    quotes: 'Envolver en comillas',
    asciiOnly: 'Escapar no ASCII como \\uXXXX',
    escapeInput: 'Texto sin escapar',
    unescapeInput: 'String JSON (con o sin comillas)',
    prettyJson: 'Formatear el JSON embebido',
    rawText: 'Ver texto sin formato',
    embeddedJson: 'El texto desescapado es JSON.',
    escapes: (count: number) => `${count} ${count === 1 ? 'escape' : 'escapes'}`,
    error: (code: JsonUnescapeErrorCode, sequence: string, line: number, column: number) => {
      const where = `línea ${line}, columna ${column}`;
      switch (code) {
        case 'invalid-escape':
          return `Escape inválido ${sequence} en ${where}.`;
        case 'incomplete-escape':
          return `El texto termina con un escape incompleto en ${where}.`;
        case 'invalid-unicode':
          return `Escape unicode inválido ${sequence} en ${where}: se espera \\u y 4 dígitos hexadecimales.`;
        case 'lone-surrogate':
          return `Surrogate suelto ${sequence} en ${where}: un surrogate alto debe ir seguido de uno bajo.`;
        case 'unescaped-quote':
          return `Comilla sin escapar en ${where}: usa \\" dentro de un string entre comillas.`;
        case 'control-char':
          return `Carácter de control sin escapar en ${where}: usa \\n, \\t o \\uXXXX dentro de un string entre comillas.`;
      }
    },
  },
});
