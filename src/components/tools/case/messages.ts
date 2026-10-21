import { defineMessages } from '~/i18n/react';
import type { CaseId } from '~/lib/tools/case';

const machineCases = {
  snake: 'snake_case',
  kebab: 'kebab-case',
  camel: 'camelCase',
  pascal: 'PascalCase',
  constant: 'CONSTANT_CASE',
  dot: 'dot.case',
  path: 'path/case',
} as const;

export const caseMessages = defineMessages<{
  convertTo: string;
  removeAccents: string;
  inputLabel: string;
  allCases: string;
  output: (caseName: string) => string;
  cases: Record<CaseId, string>;
}>({
  en: {
    convertTo: 'Convert to',
    removeAccents: 'Remove accents',
    inputLabel: 'Text, one item per line',
    allCases: 'All cases',
    output: (caseName: string) => `Output (${caseName})`,
    cases: {
      ...machineCases,
      title: 'Title Case',
      sentence: 'Sentence case',
      lower: 'lower case',
      upper: 'UPPER CASE',
    },
  },
  es: {
    convertTo: 'Convertir a',
    removeAccents: 'Quitar tildes',
    inputLabel: 'Texto, un elemento por línea',
    allCases: 'Todos los formatos',
    output: (caseName: string) => `Resultado (${caseName})`,
    cases: {
      ...machineCases,
      title: 'Tipo Título',
      sentence: 'Tipo oración',
      lower: 'minúsculas',
      upper: 'MAYÚSCULAS',
    },
  },
});
