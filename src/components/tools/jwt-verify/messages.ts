import { defineMessages } from '~/i18n/react';
import type { KeyFailure } from '~/lib/tools/jose/keys';
import type { VerifyFailure } from '~/lib/tools/jwt-verify';

type SignatureFailure = Exclude<VerifyFailure, KeyFailure>;

export const jwtVerifyMessages = defineMessages({
  en: {
    token: 'Token (JWT)',
    key: 'Key: shared secret, PEM public key, JWK or JWKS',
    expectedAlg: 'Expected algorithm',
    auto: 'From the token, limited by the key',
    result: 'Result',
    valid: 'Signature valid',
    invalid: 'NOT verified',
    lineAlg: (alg: string) => `alg: ${alg}`,
    lineKey: (source: string) => `key: ${source}`,
    lineKid: (kid: string) => `kid: ${kid}`,
    failures: {
      'alg-none': 'alg is "none": an unsigned token is never verified.',
      'alg-missing': 'The header has no alg.',
      'alg-unsupported': 'Unsupported alg: only HS, RS, PS and ES 256/384/512.',
      'alg-mismatch': 'The token alg differs from the expected algorithm.',
      crit: 'The header has "crit" parameters this verifier does not understand.',
      'signature-encoding': 'The signature is not canonical base64url.',
      'signature-length': 'The signature has the wrong length for this algorithm and key.',
      'signature-der':
        'This is a DER-encoded ECDSA signature. JWS requires the raw r||s form, so it is rejected.',
      signature: 'The signature does not match.',
    } satisfies Record<SignatureFailure, string>,
    weakSecret: (bytes: number, minimum: number) =>
      `The secret has ${bytes} bytes; this algorithm needs at least ${minimum} (RFC 7518).`,
    privateKey: 'A private key was pasted. Only its public part was used; a public key is enough.',
    privacy:
      'A valid signature says nothing about exp, aud or iss: check them with the claims tool. The token and key stay in this tab and nothing is fetched.',
  },
  es: {
    token: 'Token (JWT)',
    key: 'Clave: secreto compartido, clave pública PEM, JWK o JWKS',
    expectedAlg: 'Algoritmo esperado',
    auto: 'Del token, limitado por la clave',
    result: 'Resultado',
    valid: 'Firma válida',
    invalid: 'NO verificado',
    lineAlg: (alg: string) => `alg: ${alg}`,
    lineKey: (source: string) => `clave: ${source}`,
    lineKid: (kid: string) => `kid: ${kid}`,
    failures: {
      'alg-none': 'alg es "none": un token sin firma nunca se verifica.',
      'alg-missing': 'El header no trae alg.',
      'alg-unsupported': 'alg no soportado: solo HS, RS, PS y ES 256/384/512.',
      'alg-mismatch': 'El alg del token no es el algoritmo esperado.',
      crit: 'El header trae parámetros "crit" que este verificador no entiende.',
      'signature-encoding': 'La firma no es base64url canónico.',
      'signature-length': 'La firma tiene un largo incorrecto para este algoritmo y clave.',
      'signature-der':
        'Es una firma ECDSA en DER. JWS exige la forma cruda r||s, así que se rechaza.',
      signature: 'La firma no coincide.',
    },
    weakSecret: (bytes: number, minimum: number) =>
      `El secreto tiene ${bytes} bytes; este algoritmo necesita al menos ${minimum} (RFC 7518).`,
    privateKey:
      'Se pegó una clave privada. Solo se usó su parte pública; basta con la clave pública.',
    privacy:
      'Una firma válida no dice nada de exp, aud ni iss: revísalos con la herramienta de claims. El token y la clave se quedan en esta pestaña y no se descarga nada.',
  },
});
