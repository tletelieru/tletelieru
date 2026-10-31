import { defineMessages } from '~/i18n/react';
import type { AccountReport } from '~/lib/tools/bank-account';

export const bankAccountMessages = defineMessages({
  en: {
    input: 'Accounts (one per line)',
    kind: 'Account type',
    kinds: { auto: 'Auto', iban: 'IBAN', clabe: 'CLABE', cbu: 'CBU / CVU' },
    valid: 'valid',
    invalid: 'invalid',
    detail: {
      country: 'Country',
      bank: 'Bank code',
      bankName: 'Bank',
      branch: 'Branch',
      plaza: 'Plaza',
      account: 'Account',
      checkDigit: 'Check digits',
      type: 'Provider',
    },
    error: (report: AccountReport): string => {
      switch (report.error) {
        case 'format':
          return 'Wrong characters or length';
        case 'country':
          return 'Country without a known IBAN format';
        case 'length':
          return `Must have ${report.expected} characters`;
        case 'checksum':
          return `Check digits do not match (expected ${report.expected})`;
        case 'unknown':
          return 'Not an IBAN, CLABE, CBU or CVU';
        default:
          return '';
      }
    },
  },
  es: {
    input: 'Cuentas (una por línea)',
    kind: 'Tipo de cuenta',
    kinds: { auto: 'Automático', iban: 'IBAN', clabe: 'CLABE', cbu: 'CBU / CVU' },
    valid: 'válida',
    invalid: 'inválida',
    detail: {
      country: 'País',
      bank: 'Código de banco',
      bankName: 'Banco',
      branch: 'Sucursal',
      plaza: 'Plaza',
      account: 'Cuenta',
      checkDigit: 'Dígitos de control',
      type: 'Proveedor',
    },
    error: (report: AccountReport): string => {
      switch (report.error) {
        case 'format':
          return 'Caracteres o largo incorrectos';
        case 'country':
          return 'País sin formato IBAN conocido';
        case 'length':
          return `Debe tener ${report.expected} caracteres`;
        case 'checksum':
          return `Los dígitos de control no coinciden (se esperaba ${report.expected})`;
        case 'unknown':
          return 'No es IBAN, CLABE, CBU ni CVU';
        default:
          return '';
      }
    },
  },
});
