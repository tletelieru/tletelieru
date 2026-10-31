import { defineMessages } from '~/i18n/react';
import type { KeyFailure } from '~/lib/tools/jose/keys';
import type { JweFailure, JwePart } from '~/lib/tools/jwe';

type DecryptFailure = Exclude<JweFailure, KeyFailure>;

export const jweMessages = defineMessages({
  en: {
    token: 'Token (JWE)',
    key: 'Key: AES key, RSA private PEM, JWK or JWKS',
    structure: 'Structure',
    header: 'Protected header',
    plaintext: 'Decrypted payload',
    nestedHeader: 'Nested JWT header',
    nestedPayload: 'Nested JWT payload',
    nestedHint: 'cty says this JWE carries a nested JWT.',
    nestedFound:
      'The plaintext is a nested JWT. Its signature is not verified here: use the JWT verifier.',
    binary: 'The plaintext is binary: shown as Base64.',
    decrypted: 'Decrypted and authenticated.',
    bytes: (name: string, count: number) => `${name}: ${count} bytes`,
    parts: {
      protected: 'Protected header',
      encryptedKey: 'Encrypted key',
      iv: 'IV',
      ciphertext: 'Ciphertext',
      tag: 'Authentication tag',
    } satisfies Record<JwePart, string>,
    unsupported: {
      alg: (value: string) =>
        `Key management "${value}" is not supported. Supported: dir, A128KW, A256KW, RSA-OAEP, RSA-OAEP-256.`,
      enc: (value: string) =>
        `Content encryption "${value}" is not supported: only A128GCM and A256GCM (CBC-HS is not available).`,
      zip: (value: string) => `Compression "zip: ${value}" is not supported.`,
      crit: (value: string) => `Critical header parameters are not supported: ${value}.`,
    },
    errors: {
      jws: 'This has 3 parts: it is a signed JWT, not a JWE. Use the JWT decoder.',
      segments: (count: number) =>
        `A compact JWE has 5 parts separated by dots; this one has ${count}.`,
      base64: (part: string) => `${part} is not valid base64url.`,
      utf8: 'The protected header is not valid UTF-8.',
      json: (line: number, column: number) =>
        `The protected header is not valid JSON (line ${line}, column ${column}).`,
      notObject: 'The protected header must be a JSON object.',
      missingAlg: 'The protected header has no alg.',
      missingEnc: 'The protected header has no enc.',
    },
    failures: {
      unsupported: 'This combination cannot be decrypted here.',
      'encrypted-key-present': 'With alg "dir" the encrypted key part must be empty.',
      'cek-size': 'The key has the wrong size for this algorithm.',
      'iv-size': 'The IV must have 12 bytes.',
      'tag-size': 'The authentication tag must have 16 bytes.',
      decrypt: 'Decryption failed: wrong key or tampered token.',
    } satisfies Record<DecryptFailure, string>,
    privacy: 'Decryption happens in this tab with Web Crypto. Nothing is stored or sent anywhere.',
  },
  es: {
    token: 'Token (JWE)',
    key: 'Clave: clave AES, PEM privada RSA, JWK o JWKS',
    structure: 'Estructura',
    header: 'Header protegido',
    plaintext: 'Payload descifrado',
    nestedHeader: 'Header del JWT anidado',
    nestedPayload: 'Payload del JWT anidado',
    nestedHint: 'cty indica que este JWE lleva un JWT anidado.',
    nestedFound:
      'El texto descifrado es un JWT anidado. Aquí no se verifica su firma: usa el verificador JWT.',
    binary: 'El texto descifrado es binario: se muestra en Base64.',
    decrypted: 'Descifrado y autenticado.',
    bytes: (name: string, count: number) => `${name}: ${count} bytes`,
    parts: {
      protected: 'Header protegido',
      encryptedKey: 'Clave cifrada',
      iv: 'IV',
      ciphertext: 'Texto cifrado',
      tag: 'Tag de autenticación',
    },
    unsupported: {
      alg: (value: string) =>
        `El manejo de claves "${value}" no está soportado. Soportados: dir, A128KW, A256KW, RSA-OAEP, RSA-OAEP-256.`,
      enc: (value: string) =>
        `El cifrado de contenido "${value}" no está soportado: solo A128GCM y A256GCM (CBC-HS no está disponible).`,
      zip: (value: string) => `La compresión "zip: ${value}" no está soportada.`,
      crit: (value: string) => `Los parámetros críticos del header no están soportados: ${value}.`,
    },
    errors: {
      jws: 'Tiene 3 partes: es un JWT firmado, no un JWE. Usa el decodificador JWT.',
      segments: (count: number) =>
        `Un JWE compacto tiene 5 partes separadas por puntos; este tiene ${count}.`,
      base64: (part: string) => `${part} no es base64url válido.`,
      utf8: 'El header protegido no es UTF-8 válido.',
      json: (line: number, column: number) =>
        `El header protegido no es JSON válido (línea ${line}, columna ${column}).`,
      notObject: 'El header protegido debe ser un objeto JSON.',
      missingAlg: 'El header protegido no trae alg.',
      missingEnc: 'El header protegido no trae enc.',
    },
    failures: {
      unsupported: 'Esta combinación no se puede descifrar aquí.',
      'encrypted-key-present': 'Con alg "dir" la parte de clave cifrada debe estar vacía.',
      'cek-size': 'La clave tiene un tamaño incorrecto para este algoritmo.',
      'iv-size': 'El IV debe tener 12 bytes.',
      'tag-size': 'El tag de autenticación debe tener 16 bytes.',
      decrypt: 'No se pudo descifrar: clave incorrecta o token alterado.',
    },
    privacy: 'El descifrado ocurre en esta pestaña con Web Crypto. Nada se guarda ni se envía.',
  },
});
