import { defineMessages } from '~/i18n/react';

export const jsonTypesMessages = defineMessages({
  en: {
    target: 'Language',
    rootName: 'Root type name',
    types: (count: number) => `${count} ${count === 1 ? 'type' : 'types'}`,
  },
  es: {
    target: 'Lenguaje',
    rootName: 'Nombre del tipo raíz',
    types: (count: number) => `${count} ${count === 1 ? 'tipo' : 'tipos'}`,
  },
});
