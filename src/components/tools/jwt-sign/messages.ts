import { defineMessages } from '~/i18n/react';

export const jwtSignMessages = defineMessages({
  en: {
    algorithm: 'Algorithm',
    unsigned: 'Unsigned (alg: none)',
    ttl: 'exp lifetime (seconds)',
    setIat: 'Set iat to now',
    setExp: 'Set exp from lifetime',
    header: 'Header (JSON)',
    payload: 'Payload (JSON)',
    key: 'Key: shared secret, PEM private key or JWK',
    token: 'Signed token',
    unsignedToken: 'Unsigned token',
    unsignedWarning:
      'Unsigned token: anyone can forge it and no verifier should accept it. Use it only to test that your service rejects alg: none.',
    algOverridden: (from: string, to: string) => `The header said alg "${from}"; "${to}" was used.`,
    weakSecret: (bytes: number, minimum: number) =>
      `The secret has ${bytes} bytes; this algorithm needs at least ${minimum} (RFC 7518).`,
    badPayload: 'Fix the payload JSON first: it has to be an object.',
    sideNames: { header: 'header', payload: 'payload' },
    json: (side: string, line: number, column: number) =>
      `The ${side} is not valid JSON (line ${line}, column ${column}).`,
    notObject: (side: string) => `The ${side} must be a JSON object.`,
    failed: 'Web Crypto could not sign with this key.',
    privacy:
      'Signing happens in this tab with Web Crypto. The key and token are not stored or sent anywhere.',
  },
  es: {
    algorithm: 'Algoritmo',
    unsigned: 'Sin firma (alg: none)',
    ttl: 'Vigencia de exp (segundos)',
    setIat: 'Poner iat en ahora',
    setExp: 'Poner exp según la vigencia',
    header: 'Header (JSON)',
    payload: 'Payload (JSON)',
    key: 'Clave: secreto compartido, clave privada PEM o JWK',
    token: 'Token firmado',
    unsignedToken: 'Token sin firma',
    unsignedWarning:
      'Token sin firma: cualquiera puede falsificarlo y ningún verificador debería aceptarlo. Úsalo solo para probar que tu servicio rechaza alg: none.',
    algOverridden: (from: string, to: string) => `El header decía alg "${from}"; se usó "${to}".`,
    weakSecret: (bytes: number, minimum: number) =>
      `El secreto tiene ${bytes} bytes; este algoritmo necesita al menos ${minimum} (RFC 7518).`,
    badPayload: 'Primero corrige el JSON del payload: debe ser un objeto.',
    sideNames: { header: 'header', payload: 'payload' },
    json: (side: string, line: number, column: number) =>
      `El ${side} no es JSON válido (línea ${line}, columna ${column}).`,
    notObject: (side: string) => `El ${side} debe ser un objeto JSON.`,
    failed: 'Web Crypto no pudo firmar con esta clave.',
    privacy:
      'La firma ocurre en esta pestaña con Web Crypto. La clave y el token no se guardan ni se envían a ningún lado.',
  },
});
