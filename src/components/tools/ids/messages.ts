import { defineMessages } from '~/i18n/react';

export const idLinesMessages = defineMessages({
  en: {
    mode: 'Mode',
    validate: 'Validate',
    format: 'Format',
    generate: 'Generate',
    outputStyle: 'Output style',
    styles: { full: 'With separators', dash: 'Dash only', plain: 'No separators' },
    howMany: 'How many',
    generateAgain: 'Generate again',
    valid: (formatted: string) => `${formatted}  ✔ valid`,
    wrongDv: (line: string, expected: string) =>
      `${line}  ✘ wrong check digit (expected ${expected})`,
    invalidDv: (line: string) => `${line}  ✘ invalid check digit`,
    repeated: (line: string) => `${line}  ✘ repeated digits`,
    notA: (line: string, noun: string) => `${line}  ✘ not a ${noun}`,
    summary: (valid: number, total: number) => `${valid} / ${total} valid`,
  },
  es: {
    mode: 'Modo',
    validate: 'Validar',
    format: 'Formatear',
    generate: 'Generar',
    outputStyle: 'Estilo de salida',
    styles: { full: 'Con separadores', dash: 'Solo guion', plain: 'Sin separadores' },
    howMany: 'Cantidad',
    generateAgain: 'Generar de nuevo',
    valid: (formatted: string) => `${formatted}  ✔ válido`,
    wrongDv: (line: string, expected: string) =>
      `${line}  ✘ dígito verificador incorrecto (esperado ${expected})`,
    invalidDv: (line: string) => `${line}  ✘ dígito verificador inválido`,
    repeated: (line: string) => `${line}  ✘ dígitos repetidos`,
    notA: (line: string, noun: string) => `${line}  ✘ formato de ${noun} inválido`,
    summary: (valid: number, total: number) => `${valid} / ${total} válidos`,
  },
});
