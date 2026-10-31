import { defineMessages } from '~/i18n/react';

export const listDiffMessages = defineMessages({
  en: {
    listA: 'List A',
    listB: 'List B',
    amounts: 'Second column is an amount (id,amount)',
    ignoreCase: 'Ignore case in IDs',
    onlyA: (count: number) => `Only in A (${count})`,
    onlyB: (count: number) => `Only in B (${count})`,
    both: (count: number) => `In both (${count})`,
    mismatches: (count: number) => `Amount mismatches (${count})`,
    duplicates: 'Repeated IDs, amounts summed',
    totals: (a: string, b: string) => `Totals: A ${a} · B ${b}`,
    invalid: (side: string, line: number, text: string) =>
      `List ${side}, line ${line}: "${text}" has no valid amount`,
    summary: (onlyA: number, onlyB: number, both: number, mismatches: number) =>
      `A ${onlyA} · B ${onlyB} · both ${both} · mismatches ${mismatches}`,
  },
  es: {
    listA: 'Lista A',
    listB: 'Lista B',
    amounts: 'La segunda columna es un monto (id,monto)',
    ignoreCase: 'Ignorar mayúsculas en los IDs',
    onlyA: (count: number) => `Solo en A (${count})`,
    onlyB: (count: number) => `Solo en B (${count})`,
    both: (count: number) => `En ambas (${count})`,
    mismatches: (count: number) => `Montos distintos (${count})`,
    duplicates: 'IDs repetidos, montos sumados',
    totals: (a: string, b: string) => `Totales: A ${a} · B ${b}`,
    invalid: (side: string, line: number, text: string) =>
      `Lista ${side}, línea ${line}: "${text}" no tiene un monto válido`,
    summary: (onlyA: number, onlyB: number, both: number, mismatches: number) =>
      `A ${onlyA} · B ${onlyB} · ambas ${both} · distintos ${mismatches}`,
  },
});
