import { defineMessages } from '~/i18n/react';

export const statsMessages = defineMessages({
  en: {
    input: 'Numbers (one per line)',
    decimals: 'Decimals',
    count: 'Count',
    sum: 'Sum',
    mean: 'Mean',
    median: 'Median',
    min: 'Min',
    max: 'Max',
    stddevSample: 'Std. deviation (sample)',
    stddevPopulation: 'Std. deviation (population)',
    invalid: (tokens: string) => `Ignored, not numbers: ${tokens}`,
  },
  es: {
    input: 'Números (uno por línea)',
    decimals: 'Decimales',
    count: 'Cantidad',
    sum: 'Suma',
    mean: 'Promedio',
    median: 'Mediana',
    min: 'Mínimo',
    max: 'Máximo',
    stddevSample: 'Desv. estándar (muestra)',
    stddevPopulation: 'Desv. estándar (población)',
    invalid: (tokens: string) => `Ignorados, no son números: ${tokens}`,
  },
});
