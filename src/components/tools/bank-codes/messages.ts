import { defineMessages } from '~/i18n/react';
import type { BankCodeDetail, BankCodeError, BankCodeKind } from '~/lib/tools/bank-codes';

export const bankCodesMessages = defineMessages({
  en: {
    input: 'Codes (one per line)',
    valid: 'valid',
    invalid: 'invalid',
    kinds: { bic: 'SWIFT/BIC', aba: 'ABA routing', sort: 'UK sort code' } satisfies Record<
      BankCodeKind,
      string
    >,
    errors: {
      format: 'Wrong format',
      country: 'Unknown country code',
      checksum: 'Checksum does not match',
      unknown: 'Not a BIC, ABA routing number or sort code',
    } satisfies Record<BankCodeError, string>,
    details: {
      institution: 'Institution',
      country: 'Country',
      location: 'Location',
      branch: 'Branch',
      testCode: 'Test BIC',
      passive: 'Passive participant',
      primaryOffice: 'Primary office',
      routingSymbol: 'Federal Reserve symbol',
      institutionId: 'Institution ID',
      bank: 'Bank',
      branchCode: 'Branch',
    } satisfies Record<BankCodeDetail['key'], string>,
  },
  es: {
    input: 'Códigos (uno por línea)',
    valid: 'válido',
    invalid: 'inválido',
    kinds: { bic: 'SWIFT/BIC', aba: 'ABA routing', sort: 'Sort code UK' } satisfies Record<
      BankCodeKind,
      string
    >,
    errors: {
      format: 'Formato incorrecto',
      country: 'Código de país desconocido',
      checksum: 'La suma de control no coincide',
      unknown: 'No es un BIC, número ABA ni sort code',
    } satisfies Record<BankCodeError, string>,
    details: {
      institution: 'Institución',
      country: 'País',
      location: 'Ubicación',
      branch: 'Sucursal',
      testCode: 'BIC de prueba',
      passive: 'Participante pasivo',
      primaryOffice: 'Oficina principal',
      routingSymbol: 'Símbolo de la Reserva Federal',
      institutionId: 'ID de la institución',
      bank: 'Banco',
      branchCode: 'Sucursal',
    } satisfies Record<BankCodeDetail['key'], string>,
  },
});
