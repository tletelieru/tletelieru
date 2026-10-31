import { defineMessages } from '~/i18n/react';
import type { MinorError } from '~/lib/tools/minor-units';

export const minorUnitsMessages = defineMessages({
  en: {
    amounts: 'Amounts (one per line)',
    minorValues: 'Minor units (one per line)',
    currency: 'Currency',
    direction: 'Direction',
    rounding: 'Extra decimals',
    directions: { toMinor: 'Amount → minor units', toAmount: 'Minor units → amount' },
    roundings: {
      strict: 'Reject',
      halfUp: 'Half up',
      halfEven: 'Half even',
      down: 'Truncate',
    },
    decimals: (count: number) => `${count} ${count === 1 ? 'decimal' : 'decimals'}`,
    error: ({ line, code, text }: MinorError): string => {
      switch (code) {
        case 'invalid':
          return `Line ${line}: "${text}" is not a plain number (use a dot for decimals)`;
        case 'precision':
          return `Line ${line}: "${text}" has more decimals than the currency allows`;
        case 'fractional':
          return `Line ${line}: "${text}" must be a whole number of minor units`;
      }
    },
  },
  es: {
    amounts: 'Montos (uno por línea)',
    minorValues: 'Unidades menores (una por línea)',
    currency: 'Moneda',
    direction: 'Dirección',
    rounding: 'Decimales de más',
    directions: { toMinor: 'Monto → unidades menores', toAmount: 'Unidades menores → monto' },
    roundings: {
      strict: 'Rechazar',
      halfUp: 'Mitad hacia arriba',
      halfEven: 'Mitad al par',
      down: 'Truncar',
    },
    decimals: (count: number) => `${count} ${count === 1 ? 'decimal' : 'decimales'}`,
    error: ({ line, code, text }: MinorError): string => {
      switch (code) {
        case 'invalid':
          return `Línea ${line}: "${text}" no es un número simple (usa punto para los decimales)`;
        case 'precision':
          return `Línea ${line}: "${text}" tiene más decimales de los que admite la moneda`;
        case 'fractional':
          return `Línea ${line}: "${text}" debe ser un número entero de unidades menores`;
      }
    },
  },
});
