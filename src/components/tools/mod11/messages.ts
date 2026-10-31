import { defineMessages } from '~/i18n/react';

export const mod11Messages = defineMessages({
  en: {
    input: 'Numbers (one per line)',
    weights: 'Weights',
    direction: 'Direction',
    directions: { right: 'From the right', left: 'From the left' },
    result: 'Result',
    results: { complement: '11 − remainder', remainder: 'Remainder' },
    ten: 'If 10',
    eleven: 'If 11',
    presets: { rut: 'RUT', cpf: 'CPF', isbn10: 'ISBN-10' },
    sum: 'Sum',
    check: 'Check digit',
    invalid: (text: string) => `"${text}" is not a number`,
    badWeights: 'Enter weights as whole numbers separated by commas.',
  },
  es: {
    input: 'Números (uno por línea)',
    weights: 'Pesos',
    direction: 'Dirección',
    directions: { right: 'Desde la derecha', left: 'Desde la izquierda' },
    result: 'Resultado',
    results: { complement: '11 − resto', remainder: 'Resto' },
    ten: 'Si da 10',
    eleven: 'Si da 11',
    presets: { rut: 'RUT', cpf: 'CPF', isbn10: 'ISBN-10' },
    sum: 'Suma',
    check: 'Dígito verificador',
    invalid: (text: string) => `"${text}" no es un número`,
    badWeights: 'Ingresa los pesos como números enteros separados por comas.',
  },
});
