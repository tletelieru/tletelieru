import { defineMessages } from '~/i18n/react';

export const sqlLikeMessages = defineMessages({
  en: {
    match: 'Match',
    contains: 'Contains %v%',
    starts: 'Starts v%',
    ends: 'Ends %v',
    exact: 'Exact',
    joiner: 'Joiner',
    ilike: 'ILIKE (Postgres)',
    escapeWildcards: 'Escape % and _',
    wrap: 'Wrap in parentheses',
    caseInsensitive: 'Case-insensitive (i)',
  },
  es: {
    match: 'Coincidencia',
    contains: 'Contiene %v%',
    starts: 'Empieza v%',
    ends: 'Termina %v',
    exact: 'Exacta',
    joiner: 'Conector',
    ilike: 'ILIKE (Postgres)',
    escapeWildcards: 'Escapar % y _',
    wrap: 'Envolver en paréntesis',
    caseInsensitive: 'Sin distinguir mayúsculas (i)',
  },
});
