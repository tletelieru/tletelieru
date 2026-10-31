import { utf8, type KeyEncoding } from './hash';
import { isJwsAlg, jwsSpecs, type JwsAlg } from './jose/algorithms';
import { base64UrlToBytes } from './jose/encoding';
import { looksLikeDerSignature, signatureBytes, verifyJws } from './jose/jws';
import {
  isPrivateJwk,
  octBytes,
  parseKeyMaterial,
  selectKey,
  type KeyFailure,
  type KeySource,
} from './jose/keys';
import { decodeJwt, type JwtError } from './jwt';

export const expectedAlgs = ['auto', ...Object.keys(jwsSpecs)] as readonly string[];

export type VerifyFailure =
  | KeyFailure
  | 'alg-none'
  | 'alg-missing'
  | 'alg-unsupported'
  | 'alg-mismatch'
  | 'crit'
  | 'signature-encoding'
  | 'signature-length'
  | 'signature-der'
  | 'signature';

export type VerifyWarning =
  { code: 'weak-secret'; bytes: number; minimum: number } | { code: 'private-key' };

export interface VerifyInput {
  token: string;
  key: string;
  encoding: KeyEncoding;
  expectedAlg: string;
}

export type VerifyResult =
  | {
      status: 'valid';
      alg: JwsAlg;
      source: KeySource;
      kid: string | null;
      warnings: VerifyWarning[];
    }
  | { status: 'invalid'; reason: VerifyFailure; alg: string | null }
  | { status: 'malformed'; error: JwtError };

function checkHeader(
  header: Record<string, unknown>,
  alg: string | null,
  expectedAlg: string,
): VerifyFailure | null {
  if (alg === null) return 'alg-missing';
  if (alg.toLowerCase() === 'none') return 'alg-none';
  if (!isJwsAlg(alg)) return 'alg-unsupported';
  if (expectedAlg !== 'auto' && expectedAlg !== alg) return 'alg-mismatch';
  return header.crit === undefined ? null : 'crit';
}

export async function verifyJwt(input: VerifyInput): Promise<VerifyResult> {
  const decoded = decodeJwt(input.token, 0);
  if (!decoded.ok) return { status: 'malformed', error: decoded.error };
  const { alg, header, parts } = decoded.jwt;
  const invalid = (reason: VerifyFailure): VerifyResult => ({ status: 'invalid', reason, alg });

  const headerFailure = checkHeader(header, alg, input.expectedAlg);
  if (headerFailure) return invalid(headerFailure);
  if (!isJwsAlg(alg)) return invalid('alg-unsupported');

  const parsed = parseKeyMaterial(input.key, input.encoding);
  if (!parsed.ok) return invalid(parsed.error);
  const spec = jwsSpecs[alg];
  const kid = typeof header.kid === 'string' ? header.kid : null;
  const jwk = selectKey(parsed.material, {
    family: spec.family,
    algs: [alg],
    kid,
    curve: spec.curve,
    use: 'sig',
    ops: ['verify'],
  });
  if (typeof jwk === 'string') return invalid(jwk);

  const signature = base64UrlToBytes(parts.signature);
  if (!signature) return invalid('signature-encoding');
  if (signature.length !== signatureBytes(alg, jwk)) {
    const der = spec.family === 'EC' && looksLikeDerSignature(signature);
    return invalid(der ? 'signature-der' : 'signature-length');
  }

  const signingInput = utf8(`${parts.header}.${parts.payload}`);
  let verified: boolean;
  try {
    verified = await verifyJws(alg, jwk, signingInput, signature);
  } catch {
    return invalid('key-invalid');
  }
  if (!verified) return invalid('signature');

  const warnings: VerifyWarning[] = [];
  const secretLength = octBytes(jwk)?.length ?? null;
  if (secretLength !== null && secretLength < spec.hashBytes) {
    warnings.push({ code: 'weak-secret', bytes: secretLength, minimum: spec.hashBytes });
  }
  if (isPrivateJwk(jwk)) warnings.push({ code: 'private-key' });
  return { status: 'valid', alg, source: parsed.material.source, kid, warnings };
}
