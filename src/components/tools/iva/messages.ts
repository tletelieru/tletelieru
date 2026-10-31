import { defineMessages } from '~/i18n/react';

export const ivaMessages = defineMessages({
  en: {
    netInput: 'Net amounts (one per line)',
    grossInput: 'Gross amounts (one per line)',
    mode: 'Mode',
    modes: { netToGross: 'Factura: net → total', grossToNet: 'Boleta: total → net' },
    rate: 'Rate %',
    decimals: 'Decimals',
    item: 'Item',
    net: 'Net',
    iva: 'IVA',
    gross: 'Total',
    total: 'Total',
    badRate: 'Enter a rate of zero or more.',
    invalid: (line: number, text: string) => `Line ${line}: "${text}" is not a valid amount`,
  },
  es: {
    netInput: 'Montos netos (uno por línea)',
    grossInput: 'Montos brutos (uno por línea)',
    mode: 'Modo',
    modes: { netToGross: 'Factura: neto → total', grossToNet: 'Boleta: total → neto' },
    rate: 'Tasa %',
    decimals: 'Decimales',
    item: 'Ítem',
    net: 'Neto',
    iva: 'IVA',
    gross: 'Total',
    total: 'Total',
    badRate: 'Ingresa una tasa de cero o más.',
    invalid: (line: number, text: string) => `Línea ${line}: "${text}" no es un monto válido`,
  },
});
