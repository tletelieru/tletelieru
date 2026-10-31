import { defineMessages } from '~/i18n/react';
import type { RoundingMode } from '~/lib/tools/_shared/decimal';

export const roundingMessages = defineMessages({
  en: {
    input: 'Values (one per line)',
    decimals: 'Decimals',
    value: 'Value',
    modes: {
      halfUp: 'Half up',
      halfDown: 'Half down',
      halfEven: 'Half even',
      up: 'Up',
      down: 'Down',
      ceiling: 'Ceiling',
      floor: 'Floor',
    } satisfies Record<RoundingMode, string>,
    invalid: (line: number, text: string) => `Line ${line}: "${text}" is not a plain number`,
  },
  es: {
    input: 'Valores (uno por línea)',
    decimals: 'Decimales',
    value: 'Valor',
    modes: {
      halfUp: 'Mitad arriba',
      halfDown: 'Mitad abajo',
      halfEven: 'Mitad al par',
      up: 'Lejos del cero',
      down: 'Hacia cero',
      ceiling: 'Techo',
      floor: 'Piso',
    } satisfies Record<RoundingMode, string>,
    invalid: (line: number, text: string) => `Línea ${line}: "${text}" no es un número simple`,
  },
});
