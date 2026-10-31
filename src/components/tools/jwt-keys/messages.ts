import { defineMessages } from '~/i18n/react';
import type { TestKeyKind } from '~/lib/tools/jwt-keys';

const kinds: Record<TestKeyKind, string> = {
  'rsa-2048': 'RSA 2048',
  'rsa-3072': 'RSA 3072',
  'rsa-4096': 'RSA 4096',
  'ec-p256': 'EC P-256',
  'ec-p384': 'EC P-384',
  'ec-p521': 'EC P-521',
  'hmac-256': 'HMAC 256',
  'hmac-384': 'HMAC 384',
  'hmac-512': 'HMAC 512',
};

export const jwtKeysMessages = defineMessages({
  en: {
    mode: 'Mode',
    modes: { convert: 'Convert', generate: 'Generate' },
    kind: 'Key type',
    kinds,
    input: 'Key: PEM, JWK or JWKS',
    generate: 'Generate test key',
    generating: 'Generating…',
    failed: 'This browser could not generate that key.',
    jwk: 'JWK',
    pem: 'PEM',
    publicJwk: 'Public JWK',
    publicPem: 'Public PEM',
    secretHex: 'Secret (hex)',
    octNoPem: 'Symmetric keys have no PEM form.',
    testingOnly:
      'FOR TESTING ONLY. Generated in this tab, but do not use these keys in production: they went through your clipboard and screen.',
    privacy: 'Keys stay in this tab: they are not stored, sent or added to history.',
  },
  es: {
    mode: 'Modo',
    modes: { convert: 'Convertir', generate: 'Generar' },
    kind: 'Tipo de clave',
    kinds,
    input: 'Clave: PEM, JWK o JWKS',
    generate: 'Generar clave de prueba',
    generating: 'Generando…',
    failed: 'Este navegador no pudo generar esa clave.',
    jwk: 'JWK',
    pem: 'PEM',
    publicJwk: 'JWK pública',
    publicPem: 'PEM pública',
    secretHex: 'Secreto (hex)',
    octNoPem: 'Las claves simétricas no tienen forma PEM.',
    testingOnly:
      'SOLO PARA PRUEBAS. Se generan en esta pestaña, pero no uses estas claves en producción: pasaron por tu portapapeles y tu pantalla.',
    privacy:
      'Las claves se quedan en esta pestaña: no se guardan, no se envían ni van al historial.',
  },
});
