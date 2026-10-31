import { defineMessages } from '~/i18n/react';
import type { StatementField } from '~/lib/tools/bank-statement';

export const bankStatementMessages = defineMessages({
  en: {
    input: 'Bank statement (CSV)',
    output: 'Output',
    outputs: { csv: 'CSV', json: 'JSON' },
    dateOrder: 'Date format',
    dateOrders: { auto: 'Auto', dmy: 'DD/MM/YYYY', mdy: 'MM/DD/YYYY', ymd: 'YYYY-MM-DD' },
    auto: 'Auto',
    none: 'None',
    fields: {
      date: 'Date',
      description: 'Description',
      debit: 'Debit',
      credit: 'Credit',
      balance: 'Balance',
      amount: 'Signed amount',
    } satisfies Record<StatementField, string>,
    noDate: 'No date column found. Pick it in the column mapping.',
    noAmount: 'No debit, credit or amount column found. Pick one in the column mapping.',
    invalid: (row: number, field: string, text: string) =>
      `Row ${row}, ${field}: "${text}" could not be read`,
    detected: (rows: number, format: string, dates: string) =>
      `${rows} ${rows === 1 ? 'row' : 'rows'} · ${format} · ${dates}`,
  },
  es: {
    input: 'Cartola bancaria (CSV)',
    output: 'Salida',
    outputs: { csv: 'CSV', json: 'JSON' },
    dateOrder: 'Formato de fecha',
    dateOrders: { auto: 'Automático', dmy: 'DD/MM/AAAA', mdy: 'MM/DD/AAAA', ymd: 'AAAA-MM-DD' },
    auto: 'Automático',
    none: 'Ninguna',
    fields: {
      date: 'Fecha',
      description: 'Descripción',
      debit: 'Cargo',
      credit: 'Abono',
      balance: 'Saldo',
      amount: 'Monto con signo',
    } satisfies Record<StatementField, string>,
    noDate: 'No se encontró la columna de fecha. Elígela en el mapeo de columnas.',
    noAmount:
      'No se encontró una columna de cargo, abono o monto. Elige una en el mapeo de columnas.',
    invalid: (row: number, field: string, text: string) =>
      `Fila ${row}, ${field}: no se pudo leer "${text}"`,
    detected: (rows: number, format: string, dates: string) =>
      `${rows} ${rows === 1 ? 'fila' : 'filas'} · ${format} · ${dates}`,
  },
});
