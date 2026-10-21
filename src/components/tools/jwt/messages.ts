import { defineMessages } from '~/i18n/react';
import type { JwtSegment, TimeClaim } from '~/lib/tools/jwt';

export const jwtMessages = defineMessages({
  en: {
    inputLabel: 'Token (JWT)',
    zone: 'Time zone',
    tokenView: 'Token',
    header: 'Header',
    payload: 'Payload',
    signature: 'Signature (base64url)',
    algorithm: (alg: string) => `alg: ${alg}`,
    noAlgorithm: 'alg: missing',
    unsignedSignature: '(empty)',
    notVerified:
      'Decoded only: the signature is not verified here. Never trust a token just because it decodes.',
    fromHandoff: 'Token loaded from smart paste. It is not stored anywhere.',
    fromUrl: 'Token loaded from the link. It is not stored, but it is still in the address bar.',
    removeFromUrl: 'Remove from address bar',
    claimsTitle: 'Time claims',
    claimColumn: 'Claim',
    utcColumn: 'UTC',
    relativeColumn: 'Relative',
    claimNames: {
      exp: 'exp (expires)',
      nbf: 'nbf (not before)',
      iat: 'iat (issued at)',
    } satisfies Record<TimeClaim, string>,
    status: {
      valid: 'Valid',
      expired: 'Expired',
      'not-yet-valid': 'Not yet valid',
    },
    expiresIn: (relative: string) => `Valid, expires ${relative}`,
    expiredAgo: (relative: string) => `Expired ${relative}`,
    startsIn: (relative: string) => `Not yet valid, starts ${relative}`,
    noExpiry: 'Valid, never expires',
    segmentNames: {
      header: 'header',
      payload: 'payload',
      signature: 'signature',
    } satisfies Record<JwtSegment, string>,
    errors: {
      segments: (count: number) =>
        `A JWT has 3 parts separated by dots (header.payload.signature); this one has ${count}.`,
      jwe: 'This looks like an encrypted JWE (5 parts). Only signed JWS tokens can be decoded here.',
      base64: (segment: string) => `The ${segment} is not valid base64url.`,
      utf8: (segment: string) => `The ${segment} is not valid UTF-8 once decoded.`,
      json: (segment: string, line: number, column: number) =>
        `The ${segment} is not valid JSON (line ${line}, column ${column}).`,
      notObject: (segment: string) => `The ${segment} must be a JSON object.`,
    },
    warnings: {
      algNone: 'alg is "none": the token is unsigned and must never be accepted.',
      missingAlg: 'The header has no alg.',
      missingExp: 'No exp claim: this token never expires.',
      longLifetime: (days: number) => `Very long lifetime: ${days} days (more than 30).`,
      invalidClaim: (claim: string) =>
        `${claim} is not a NumericDate (seconds since 1970-01-01 UTC).`,
      sensitiveKeys: (keys: string) =>
        `The payload looks like it carries sensitive data: ${keys}. JWT payloads are only encoded, not encrypted.`,
    },
  },
  es: {
    inputLabel: 'Token (JWT)',
    zone: 'Zona horaria',
    tokenView: 'Token',
    header: 'Header',
    payload: 'Payload',
    signature: 'Firma (base64url)',
    algorithm: (alg: string) => `alg: ${alg}`,
    noAlgorithm: 'alg: no viene',
    unsignedSignature: '(vacía)',
    notVerified:
      'Solo se decodifica: aquí no se verifica la firma. No confíes en un token solo porque se decodifica.',
    fromHandoff: 'Token cargado desde el pegado inteligente. No se guarda en ningún lado.',
    fromUrl: 'Token cargado desde el enlace. No se guarda, pero sigue en la barra de direcciones.',
    removeFromUrl: 'Quitar de la barra de direcciones',
    claimsTitle: 'Claims de tiempo',
    claimColumn: 'Claim',
    utcColumn: 'UTC',
    relativeColumn: 'Relativo',
    claimNames: {
      exp: 'exp (expira)',
      nbf: 'nbf (no antes de)',
      iat: 'iat (emitido)',
    },
    status: {
      valid: 'Válido',
      expired: 'Expirado',
      'not-yet-valid': 'Aún no válido',
    },
    expiresIn: (relative: string) => `Válido, expira ${relative}`,
    expiredAgo: (relative: string) => `Expiró ${relative}`,
    startsIn: (relative: string) => `Aún no válido, empieza ${relative}`,
    noExpiry: 'Válido, nunca expira',
    segmentNames: {
      header: 'header',
      payload: 'payload',
      signature: 'firma',
    },
    errors: {
      segments: (count: number) =>
        `Un JWT tiene 3 partes separadas por puntos (header.payload.firma); este tiene ${count}.`,
      jwe: 'Parece un JWE cifrado (5 partes). Aquí solo se pueden decodificar tokens JWS firmados.',
      base64: (segment: string) => `El segmento ${segment} no es base64url válido.`,
      utf8: (segment: string) => `El segmento ${segment} no es UTF-8 válido al decodificarlo.`,
      json: (segment: string, line: number, column: number) =>
        `El segmento ${segment} no es JSON válido (línea ${line}, columna ${column}).`,
      notObject: (segment: string) => `El segmento ${segment} debe ser un objeto JSON.`,
    },
    warnings: {
      algNone: 'alg es "none": el token no está firmado y nunca se debe aceptar.',
      missingAlg: 'El header no trae alg.',
      missingExp: 'No hay claim exp: este token nunca expira.',
      longLifetime: (days: number) => `Vigencia muy larga: ${days} días (más de 30).`,
      invalidClaim: (claim: string) =>
        `${claim} no es un NumericDate (segundos desde 1970-01-01 UTC).`,
      sensitiveKeys: (keys: string) =>
        `El payload parece llevar datos sensibles: ${keys}. El payload de un JWT solo está codificado, no cifrado.`,
    },
  },
});
