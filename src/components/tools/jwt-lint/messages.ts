import { defineMessages } from '~/i18n/react';
import type { LintSeverity } from '~/lib/tools/jwt-lint';

export const jwtLintMessages = defineMessages({
  en: {
    token: 'Token (JWT)',
    key: 'Key (optional): enables the key checks',
    result: 'Findings',
    summary: (count: number) => (count === 1 ? '1 finding' : `${count} findings`),
    none: 'No findings.',
    severities: {
      high: 'HIGH',
      medium: 'MEDIUM',
      low: 'LOW',
      info: 'INFO',
    } satisfies Record<LintSeverity, string>,
    findings: {
      algNone: 'alg is "none": the token is unsigned and must never be accepted.',
      algMissing: 'The header has no alg.',
      algUnknown: (alg: string) => `Unknown alg "${alg}".`,
      algHsPublicKey:
        'HS token with a public key: this is the alg confusion attack. Never use a public key as an HMAC secret.',
      algAsymmetricSecret:
        'Asymmetric alg with a shared secret: the key does not fit. Pin the expected algorithm in the verifier.',
      algKeyFamily: (alg: string, kty: string) => `${alg} does not fit a ${kty} key.`,
      algHsHint:
        'HS token: if your issuer uses RS or ES keys, this may be an alg confusion attempt. Pin the algorithm in the verifier.',
      keyUnreadable: (reason: string) => `The key could not be read: ${reason}`,
      weakHsKey: (bytes: number, minimum: number) =>
        `Weak key: ${bytes} bytes, this algorithm needs at least ${minimum} (RFC 7518).`,
      weakRsaKey: (bits: number) => `Weak RSA key: ${bits} bits, the minimum is 2048.`,
      missingExp: 'No exp claim: this token never expires.',
      longLifetime: (days: number) => `Very long lifetime: ${days} days (more than 30).`,
      expBeforeIat: 'exp is not after iat: the token was born expired.',
      nbfAfterExp: 'nbf is not before exp: the token can never be valid.',
      invalidClaim: (claim: string) =>
        `${claim} is not a NumericDate (seconds since 1970-01-01 UTC).`,
      expired: 'The token is expired.',
      iatFuture: 'iat is in the future.',
      sensitiveKeys: (keys: string) =>
        `Sensitive-looking claims: ${keys}. JWT payloads are only encoded, not encrypted.`,
      headerJku: (value: string) =>
        `jku header (${value}): never fetch keys from a URL the token chooses; allow-list it.`,
      headerX5u: (value: string) =>
        `x5u header (${value}): never fetch certificates from a URL the token chooses; allow-list it.`,
      headerJwk: 'jwk header: the token brings its own key. Never trust it for verification.',
      headerX5c:
        'x5c header: the token brings a certificate chain; validate it against a trust root.',
      headerCrit: 'crit header: verifiers must reject the token unless they understand each entry.',
      headerKid: (value: string) =>
        `kid "${value}": treat it as untrusted input and only use it to look up an allow-listed key.`,
      kidTraversal: (value: string) => `kid "${value}" looks like a file path traversal.`,
      kidInjection: (value: string) => `kid "${value}" looks like an injection attempt.`,
      kidUrl: (value: string) => `kid "${value}" is a URL: never fetch it.`,
    },
    privacy:
      'These are heuristics, not a verdict: the signature is not checked here. The token and key stay in this tab.',
  },
  es: {
    token: 'Token (JWT)',
    key: 'Clave (opcional): activa las revisiones de clave',
    result: 'Hallazgos',
    summary: (count: number) => (count === 1 ? '1 hallazgo' : `${count} hallazgos`),
    none: 'Sin hallazgos.',
    severities: {
      high: 'ALTO',
      medium: 'MEDIO',
      low: 'BAJO',
      info: 'INFO',
    },
    findings: {
      algNone: 'alg es "none": el token no está firmado y nunca se debe aceptar.',
      algMissing: 'El header no trae alg.',
      algUnknown: (alg: string) => `alg desconocido "${alg}".`,
      algHsPublicKey:
        'Token HS con clave pública: este es el ataque de confusión de alg. Nunca uses una clave pública como secreto HMAC.',
      algAsymmetricSecret:
        'alg asimétrico con secreto compartido: la clave no corresponde. Fija el algoritmo esperado en el verificador.',
      algKeyFamily: (alg: string, kty: string) => `${alg} no corresponde a una clave ${kty}.`,
      algHsHint:
        'Token HS: si tu emisor usa claves RS o ES, podría ser un intento de confusión de alg. Fija el algoritmo en el verificador.',
      keyUnreadable: (reason: string) => `No se pudo leer la clave: ${reason}`,
      weakHsKey: (bytes: number, minimum: number) =>
        `Clave débil: ${bytes} bytes, este algoritmo necesita al menos ${minimum} (RFC 7518).`,
      weakRsaKey: (bits: number) => `Clave RSA débil: ${bits} bits, el mínimo es 2048.`,
      missingExp: 'No hay claim exp: este token nunca expira.',
      longLifetime: (days: number) => `Vigencia muy larga: ${days} días (más de 30).`,
      expBeforeIat: 'exp no es posterior a iat: el token nació expirado.',
      nbfAfterExp: 'nbf no es anterior a exp: el token nunca puede ser válido.',
      invalidClaim: (claim: string) =>
        `${claim} no es un NumericDate (segundos desde 1970-01-01 UTC).`,
      expired: 'El token está expirado.',
      iatFuture: 'iat está en el futuro.',
      sensitiveKeys: (keys: string) =>
        `Claims que parecen sensibles: ${keys}. El payload de un JWT solo está codificado, no cifrado.`,
      headerJku: (value: string) =>
        `Header jku (${value}): nunca descargues claves desde una URL que elige el token; usa una lista permitida.`,
      headerX5u: (value: string) =>
        `Header x5u (${value}): nunca descargues certificados desde una URL que elige el token; usa una lista permitida.`,
      headerJwk: 'Header jwk: el token trae su propia clave. Nunca confíes en ella para verificar.',
      headerX5c:
        'Header x5c: el token trae una cadena de certificados; valídala contra una raíz de confianza.',
      headerCrit:
        'Header crit: los verificadores deben rechazar el token si no entienden cada entrada.',
      headerKid: (value: string) =>
        `kid "${value}": trátalo como entrada no confiable y úsalo solo para buscar una clave permitida.`,
      kidTraversal: (value: string) => `kid "${value}" parece un recorrido de rutas de archivo.`,
      kidInjection: (value: string) => `kid "${value}" parece un intento de inyección.`,
      kidUrl: (value: string) => `kid "${value}" es una URL: nunca la descargues.`,
    },
    privacy:
      'Son heurísticas, no un veredicto: aquí no se revisa la firma. El token y la clave se quedan en esta pestaña.',
  },
});
