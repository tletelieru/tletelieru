import { defineMessages } from '~/i18n/react';
import type { JsonPathSyntax } from '~/lib/tools/json-path';

export const jsonPathMessages = defineMessages({
  en: {
    path: 'JSONPath',
    view: 'Show',
    values: 'Values',
    paths: 'Paths',
    pointers: 'JSON Pointers',
    pathRequired: 'Enter a JSONPath expression, for example $.store.book[*].title',
    matches: (count: number) => `${count} ${count === 1 ? 'match' : 'matches'}`,
    syntax: (error: JsonPathSyntax): string => {
      switch (error.reason) {
        case 'root':
          return 'The path must start with $';
        case 'unbalanced':
          return `Unexpected '${error.char}' at position ${error.position}`;
        case 'unclosed':
          return `'${error.char}' at position ${error.position} is never closed`;
        case 'engine':
          return `Invalid expression: ${error.message}`;
      }
    },
  },
  es: {
    path: 'JSONPath',
    view: 'Mostrar',
    values: 'Valores',
    paths: 'Rutas',
    pointers: 'JSON Pointers',
    pathRequired: 'Escribe una expresión JSONPath, por ejemplo $.store.book[*].title',
    matches: (count: number) => `${count} ${count === 1 ? 'coincidencia' : 'coincidencias'}`,
    syntax: (error: JsonPathSyntax): string => {
      switch (error.reason) {
        case 'root':
          return 'La ruta debe empezar con $';
        case 'unbalanced':
          return `'${error.char}' inesperado en la posición ${error.position}`;
        case 'unclosed':
          return `'${error.char}' en la posición ${error.position} nunca se cierra`;
        case 'engine':
          return `Expresión inválida: ${error.message}`;
      }
    },
  },
});
