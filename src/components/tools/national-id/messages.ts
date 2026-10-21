import { defineMessages } from '~/i18n/react';

export const nationalIdMessages = defineMessages({
  en: {
    country: 'Country',
    document: 'Document',
    inputLabel: (document: string) => `${document} values, one per line`,
    noCheckDigit: 'No check digit: length only',
  },
  es: {
    country: 'País',
    document: 'Documento',
    inputLabel: (document: string) => `Valores de ${document}, uno por línea`,
    noCheckDigit: 'Sin dígito verificador: solo largo',
  },
});
