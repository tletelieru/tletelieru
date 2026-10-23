import { defineMessages } from '~/i18n/react';
import type { RegexError } from '~/lib/tools/regex';

export const regexMessages = defineMessages({
  en: {
    pattern: 'Pattern',
    flags: 'Flags',
    flagNames: {
      g: 'global',
      i: 'ignore case',
      m: 'multiline',
      s: 'dot matches newline',
      u: 'unicode',
      y: 'sticky',
    },
    replacement: 'Replace with (optional)',
    text: 'Test text',
    matchesLabel: 'Matches',
    highlight: 'Highlighted matches',
    replacePreview: 'Replace preview',
    allowRisky: 'Run risky pattern anyway',
    matches: (count: number) => `${count} ${count === 1 ? 'match' : 'matches'}`,
    truncated: (max: number) => `Showing the first ${max} matches.`,
    timedOut: 'Matching took too long and was stopped; results are partial.',
    error: (error: RegexError): string => {
      switch (error.code) {
        case 'patternRequired':
          return 'Enter a pattern.';
        case 'invalidPattern':
          return `Invalid pattern: ${error.message}`;
        case 'risky':
          return 'This pattern nests quantifiers (like (a+)+) or repeats a backreference and can freeze the page on some inputs. Rewrite it, or turn on "Run risky pattern anyway".';
      }
    },
  },
  es: {
    pattern: 'Patrón',
    flags: 'Flags',
    flagNames: {
      g: 'global',
      i: 'ignorar mayúsculas',
      m: 'multilínea',
      s: 'el punto incluye saltos de línea',
      u: 'unicode',
      y: 'sticky',
    },
    replacement: 'Reemplazar por (opcional)',
    text: 'Texto de prueba',
    matchesLabel: 'Coincidencias',
    highlight: 'Coincidencias resaltadas',
    replacePreview: 'Vista previa del reemplazo',
    allowRisky: 'Ejecutar el patrón riesgoso de todas formas',
    matches: (count: number) => `${count} ${count === 1 ? 'coincidencia' : 'coincidencias'}`,
    truncated: (max: number) => `Se muestran las primeras ${max} coincidencias.`,
    timedOut: 'La búsqueda tardó demasiado y se detuvo; los resultados son parciales.',
    error: (error: RegexError): string => {
      switch (error.code) {
        case 'patternRequired':
          return 'Escribe un patrón.';
        case 'invalidPattern':
          return `Patrón inválido: ${error.message}`;
        case 'risky':
          return 'Este patrón anida cuantificadores (como (a+)+) o repite una referencia y puede congelar la página con algunas entradas. Reescríbelo o activa "Ejecutar el patrón riesgoso de todas formas".';
      }
    },
  },
});
