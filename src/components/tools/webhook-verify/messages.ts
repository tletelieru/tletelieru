import { defineMessages } from '~/i18n/react';
import type { ToleranceStatus, WebhookError } from '~/lib/tools/webhook-verify';

export const webhookVerifyMessages = defineMessages({
  en: {
    provider: 'Provider',
    providers: { stripe: 'Stripe', github: 'GitHub', svix: 'Svix', generic: 'Generic' },
    algorithm: 'Algorithm',
    algorithms: { sha256: 'SHA-256', sha1: 'SHA-1', sha512: 'SHA-512' },
    secret: 'Signing secret',
    payload: 'Raw request body',
    messageId: 'svix-id',
    timestamp: 'svix-timestamp',
    tolerance: 'Tolerance (seconds)',
    signature: {
      stripe: 'Stripe-Signature header',
      github: 'X-Hub-Signature-256 header',
      svix: 'svix-signature header',
      generic: 'Signature (hex or base64)',
    },
    result: 'Result',
    match: 'Signature matches',
    mismatch: 'Signature does not match',
    expected: 'Expected',
    signedPayload: 'Signed payload',
    timestampLine: 'Timestamp',
    toleranceLine: {
      within: (seconds: number) => `Within the ${seconds} s tolerance`,
      outside: (seconds: number) => `Outside the ${seconds} s tolerance, possible replay`,
    } satisfies Record<ToleranceStatus, (seconds: number) => string>,
    errors: {
      header: 'The signature fields do not have the format this provider uses.',
      secret: 'This secret is not valid base64 after the whsec_ prefix.',
    } satisfies Record<WebhookError, string>,
    privacy: 'The secret stays in this tab: it is never saved in the URL, history or snippets.',
  },
  es: {
    provider: 'Proveedor',
    providers: { stripe: 'Stripe', github: 'GitHub', svix: 'Svix', generic: 'Genérico' },
    algorithm: 'Algoritmo',
    algorithms: { sha256: 'SHA-256', sha1: 'SHA-1', sha512: 'SHA-512' },
    secret: 'Secreto de firma',
    payload: 'Cuerpo crudo de la solicitud',
    messageId: 'svix-id',
    timestamp: 'svix-timestamp',
    tolerance: 'Tolerancia (segundos)',
    signature: {
      stripe: 'Encabezado Stripe-Signature',
      github: 'Encabezado X-Hub-Signature-256',
      svix: 'Encabezado svix-signature',
      generic: 'Firma (hex o base64)',
    },
    result: 'Resultado',
    match: 'La firma coincide',
    mismatch: 'La firma no coincide',
    expected: 'Esperada',
    signedPayload: 'Contenido firmado',
    timestampLine: 'Marca de tiempo',
    toleranceLine: {
      within: (seconds: number) => `Dentro de la tolerancia de ${seconds} s`,
      outside: (seconds: number) => `Fuera de la tolerancia de ${seconds} s, posible repetición`,
    } satisfies Record<ToleranceStatus, (seconds: number) => string>,
    errors: {
      header: 'Los campos de firma no tienen el formato que usa este proveedor.',
      secret: 'Este secreto no es base64 válido después del prefijo whsec_.',
    } satisfies Record<WebhookError, string>,
    privacy:
      'El secreto se queda en esta pestaña: nunca se guarda en la URL, el historial ni los snippets.',
  },
});
