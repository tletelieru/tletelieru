import { defineMessages } from '~/i18n/react';

export const iso4217Messages = defineMessages({
  en: {
    search: 'Search (code, number, name or country)',
    code: 'Code',
    numeric: 'Number',
    name: 'Name',
    minor: 'Decimals',
    countries: 'Countries',
    none: 'N/A',
    table: 'ISO 4217 currencies',
    count: (shown: number, total: number) => `${shown} of ${total}`,
    noMatches: 'No currency matches this search.',
  },
  es: {
    search: 'Buscar (código, número, nombre o país)',
    code: 'Código',
    numeric: 'Número',
    name: 'Nombre',
    minor: 'Decimales',
    countries: 'Países',
    none: 'N/A',
    table: 'Monedas ISO 4217',
    count: (shown: number, total: number) => `${shown} de ${total}`,
    noMatches: 'Ninguna moneda coincide con esta búsqueda.',
  },
});
