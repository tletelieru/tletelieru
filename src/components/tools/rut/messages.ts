import { defineMessages } from '~/i18n/react';

export const rutMessages = defineMessages({
  en: {
    mode: 'Mode',
    validate: 'Validate',
    format: 'Format',
    generate: 'Generate',
    style: 'Output format',
    styleName: {
      dots: 'Dots and dash',
      dash: 'Dash only',
      plain: 'No separators',
    },
    upperK: 'Uppercase K',
    howMany: 'How many',
    generateAgain: 'Generate again',
    inputLabel: 'RUTs, one per line',
    valid: (formatted: string) => `${formatted}  ✔ valid`,
    wrongDv: (line: string, expected: string) =>
      `${line}  ✘ wrong check digit (expected ${expected})`,
    notRut: (line: string) => `${line}  ✘ not a RUT`,
    summary: (valid: number, total: number) => `${valid} / ${total} valid`,
  },
  es: {
    mode: 'Modo',
    validate: 'Validar',
    format: 'Formatear',
    generate: 'Generar',
    style: 'Formato de salida',
    styleName: {
      dots: 'Puntos y guion',
      dash: 'Solo guion',
      plain: 'Sin separadores',
    },
    upperK: 'K mayúscula',
    howMany: 'Cantidad',
    generateAgain: 'Generar de nuevo',
    inputLabel: 'RUTs, uno por línea',
    valid: (formatted: string) => `${formatted}  ✔ válido`,
    wrongDv: (line: string, expected: string) =>
      `${line}  ✘ dígito verificador incorrecto (esperado ${expected})`,
    notRut: (line: string) => `${line}  ✘ no es un RUT`,
    summary: (valid: number, total: number) => `${valid} / ${total} válidos`,
  },
});
