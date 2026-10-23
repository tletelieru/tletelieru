import { defineMessages } from '~/i18n/react';
import type { AnyType } from '~/lib/tools/sql-any';
import { previewValues } from '~/lib/tools/sql/format';

function listed(values: readonly string[], and: string, more: string): string {
  const { shown, hidden } = previewValues(values);
  const text = shown.map((value) => `"${value}"`).join(', ');
  return hidden ? `${text} ${and} ${hidden} ${more}` : text;
}

export const sqlAnyMessages = defineMessages({
  en: {
    style: 'Array style',
    type: 'Element type',
    not: 'NOT (<> ALL)',
    invalidValues: (type: AnyType, values: string[]) =>
      `Skipped ${values.length} ${values.length === 1 ? 'value' : 'values'} that are not valid ${type}: ${listed(values, 'and', 'more')}`,
  },
  es: {
    style: 'Estilo de array',
    type: 'Tipo de elemento',
    not: 'NOT (<> ALL)',
    invalidValues: (type: AnyType, values: string[]) =>
      `Se omitieron ${values.length} ${values.length === 1 ? 'valor que no es' : 'valores que no son'} ${type} válido: ${listed(values, 'y', 'más')}`,
  },
});
