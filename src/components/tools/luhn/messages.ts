import { defineMessages } from '~/i18n/react';

const brands = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  diners: 'Diners Club',
  jcb: 'JCB',
  unionpay: 'UnionPay',
};

export const luhnMessages = defineMessages({
  en: {
    input: 'Numbers (one per line)',
    partial: 'Numbers without the check digit (one per line)',
    mode: 'Mode',
    modes: { validate: 'Validate', check: 'Check digit', cards: 'Test cards' },
    valid: 'valid',
    invalid: 'invalid',
    notDigits: 'not a number',
    expected: (digit: string) => `expected check digit ${digit}`,
    testCard: 'documented test card',
    brands,
    funding: { credit: 'Credit', debit: 'Debit', prepaid: 'Prepaid' },
    sources: { stripe: 'Stripe docs', visa: 'Visa test number' },
    number: 'Number',
    brand: 'Brand',
    type: 'Type',
    source: 'Source',
    warning:
      'Test numbers only. These are public sandbox numbers from payment provider docs: they carry no funds and only work in test mode.',
  },
  es: {
    input: 'Números (uno por línea)',
    partial: 'Números sin el dígito verificador (uno por línea)',
    mode: 'Modo',
    modes: { validate: 'Validar', check: 'Dígito verificador', cards: 'Tarjetas de prueba' },
    valid: 'válido',
    invalid: 'inválido',
    notDigits: 'no es un número',
    expected: (digit: string) => `dígito verificador esperado ${digit}`,
    testCard: 'tarjeta de prueba documentada',
    brands,
    funding: { credit: 'Crédito', debit: 'Débito', prepaid: 'Prepago' },
    sources: { stripe: 'Documentación de Stripe', visa: 'Número de prueba Visa' },
    number: 'Número',
    brand: 'Marca',
    type: 'Tipo',
    source: 'Fuente',
    warning:
      'Solo números de prueba. Son números públicos de sandbox publicados en la documentación de los proveedores de pago: no tienen fondos y solo funcionan en modo de prueba.',
  },
});
