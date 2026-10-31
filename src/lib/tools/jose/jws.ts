import type { Bytes } from '../hash';
import { jwsSpecs, type JwsAlg } from './algorithms';
import { modulusBits, octBytes, type Jwk } from './keys';

const PUBLIC_FIELDS = { RSA: ['n', 'e'], EC: ['crv', 'x', 'y'] } as const;
const PRIVATE_FIELDS = { RSA: ['d', 'p', 'q', 'dp', 'dq', 'qi'], EC: ['d'] } as const;

export function bareJwk(jwk: Jwk, part: 'public' | 'private'): JsonWebKey {
  if (jwk.kty !== 'RSA' && jwk.kty !== 'EC') throw new TypeError('asymmetric key expected');
  const names = [...PUBLIC_FIELDS[jwk.kty], ...(part === 'private' ? PRIVATE_FIELDS[jwk.kty] : [])];
  const out: JsonWebKey = { kty: jwk.kty };
  for (const name of names) {
    const value = jwk[name];
    if (value !== undefined) out[name] = value;
  }
  return out;
}

function importJwsKey(jwk: Jwk, alg: JwsAlg, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  const spec = jwsSpecs[alg];
  if (spec.family === 'oct') {
    const raw = octBytes(jwk);
    if (!raw) throw new TypeError('invalid oct key');
    return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: spec.hash }, false, [usage]);
  }
  const part = usage === 'sign' ? 'private' : 'public';
  const algorithm =
    spec.family === 'EC'
      ? { name: 'ECDSA', namedCurve: spec.curve ?? '' }
      : { name: spec.webCrypto, hash: spec.hash };
  return crypto.subtle.importKey('jwk', bareJwk(jwk, part), algorithm, false, [usage]);
}

function signatureParams(alg: JwsAlg): AlgorithmIdentifier | RsaPssParams | EcdsaParams {
  const spec = jwsSpecs[alg];
  if (spec.webCrypto === 'RSA-PSS') return { name: 'RSA-PSS', saltLength: spec.hashBytes };
  if (spec.webCrypto === 'ECDSA') return { name: 'ECDSA', hash: spec.hash };
  return spec.webCrypto;
}

export async function signJws(alg: JwsAlg, jwk: Jwk, signingInput: Bytes): Promise<Bytes> {
  const key = await importJwsKey(jwk, alg, 'sign');
  return new Uint8Array(await crypto.subtle.sign(signatureParams(alg), key, signingInput));
}

export async function verifyJws(
  alg: JwsAlg,
  jwk: Jwk,
  signingInput: Bytes,
  signature: Bytes,
): Promise<boolean> {
  const key = await importJwsKey(jwk, alg, 'verify');
  return crypto.subtle.verify(signatureParams(alg), key, signature, signingInput);
}

export function signatureBytes(alg: JwsAlg, jwk: Jwk): number {
  const spec = jwsSpecs[alg];
  if (spec.family === 'oct') return spec.hashBytes;
  if (spec.curve) return spec.curve === 'P-521' ? 132 : spec.hashBytes * 2;
  return Math.ceil((modulusBits(jwk) ?? 0) / 8);
}

export function looksLikeDerSignature(signature: Uint8Array): boolean {
  if (signature[0] !== 0x30) return false;
  const length = signature[1] ?? 0;
  if (length < 0x80) return length === signature.length - 2;
  return length === 0x81 && signature[2] === signature.length - 3;
}
