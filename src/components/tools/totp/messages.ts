import { defineMessages } from '~/i18n/react';
import type { OtpInputError } from '~/lib/tools/totp';

export const totpMessages = defineMessages({
  en: {
    secret: 'Secret (base32) or otpauth:// URI',
    type: 'Type',
    algorithm: 'Algorithm',
    digits: 'Digits',
    period: 'Period (s)',
    counter: 'Counter',
    nextCounter: 'Next counter',
    code: 'Current code',
    previous: 'Previous',
    next: 'Next',
    expires: (seconds: number) => `Changes in ${seconds}s`,
    account: (issuer: string, label: string) => [issuer, label].filter(Boolean).join(' · '),
    fromUri: 'Settings from the otpauth URI',
    privacy:
      'The secret stays in this tab: it is not saved in the URL, history or snippets, and it is gone when you close the page.',
    errors: {
      empty: '',
      badBase32: 'The secret is not valid base32 (letters A–Z and digits 2–7).',
      badUri: 'Not an otpauth://totp or otpauth://hotp URI.',
      missingSecret: 'The otpauth URI has no secret parameter.',
    } satisfies Record<OtpInputError, string>,
  },
  es: {
    secret: 'Secreto (base32) o URI otpauth://',
    type: 'Tipo',
    algorithm: 'Algoritmo',
    digits: 'Dígitos',
    period: 'Periodo (s)',
    counter: 'Contador',
    nextCounter: 'Siguiente contador',
    code: 'Código actual',
    previous: 'Anterior',
    next: 'Siguiente',
    expires: (seconds: number) => `Cambia en ${seconds}s`,
    account: (issuer: string, label: string) => [issuer, label].filter(Boolean).join(' · '),
    fromUri: 'Configuración tomada de la URI otpauth',
    privacy:
      'El secreto se queda en esta pestaña: no se guarda en la URL, el historial ni los snippets, y desaparece al cerrar la página.',
    errors: {
      empty: '',
      badBase32: 'El secreto no es base32 válido (letras A–Z y dígitos 2–7).',
      badUri: 'No es una URI otpauth://totp ni otpauth://hotp.',
      missingSecret: 'La URI otpauth no tiene el parámetro secret.',
    } satisfies Record<OtpInputError, string>,
  },
});
