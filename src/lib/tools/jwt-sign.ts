import { utf8, type KeyEncoding } from './hash';
import { parseJsonValue, type JsonError } from './json';
import { jwsSpecs, type JwsAlg } from './jose/algorithms';
import { bytesToBase64Url, isObject } from './jose/encoding';
import { signJws } from './jose/jws';
import { octBytes, parseKeyMaterial, selectKey, type KeyFailure } from './jose/keys';
import { encodeBase64Url } from './jwt';

export type SignSide = 'header' | 'payload';

export type SignError =
  | { code: 'json'; side: SignSide; error: JsonError }
  | { code: 'not-object'; side: SignSide }
  | { code: 'key'; failure: KeyFailure };

export type SignWarning =
  | { code: 'unsigned' }
  | { code: 'alg-overridden'; from: string }
  | { code: 'weak-secret'; bytes: number; minimum: number };

export interface SignInput {
  header: string;
  payload: string;
  key: string;
  encoding: KeyEncoding;
  alg: JwsAlg;
  unsigned: boolean;
}

export type SignResult =
  { ok: true; token: string; warnings: SignWarning[] } | { ok: false; error: SignError };

type ParsedObject = { ok: true; value: Record<string, unknown> } | { ok: false; error: SignError };

function parseObject(text: string, side: SignSide): ParsedObject {
  const parsed = parseJsonValue(text);
  if (!parsed.ok) return { ok: false, error: { code: 'json', side, error: parsed.error } };
  if (!isObject(parsed.value)) return { ok: false, error: { code: 'not-object', side } };
  return { ok: true, value: parsed.value };
}

export async function signJwt(input: SignInput): Promise<SignResult> {
  const header = input.header.trim() === '' ? { ok: true as const, value: { typ: 'JWT' } } : null;
  const parsedHeader = header ?? parseObject(input.header, 'header');
  if (!parsedHeader.ok) return parsedHeader;
  const payload = parseObject(input.payload, 'payload');
  if (!payload.ok) return payload;

  const alg = input.unsigned ? 'none' : input.alg;
  const warnings: SignWarning[] = [];
  const { alg: declared, ...restHeader } = parsedHeader.value as Record<string, unknown>;
  if (declared !== undefined && declared !== alg) {
    warnings.push({ code: 'alg-overridden', from: String(declared) });
  }
  const signingInput = [
    encodeBase64Url(JSON.stringify({ alg, ...restHeader })),
    encodeBase64Url(JSON.stringify(payload.value)),
  ].join('.');

  if (input.unsigned) {
    warnings.unshift({ code: 'unsigned' });
    return { ok: true, token: `${signingInput}.`, warnings };
  }

  const keyError = (failure: KeyFailure): SignResult => ({
    ok: false,
    error: { code: 'key', failure },
  });
  const parsedKey = parseKeyMaterial(input.key, input.encoding);
  if (!parsedKey.ok) return keyError(parsedKey.error);
  const spec = jwsSpecs[input.alg];
  const kid = typeof restHeader.kid === 'string' ? restHeader.kid : null;
  const jwk = selectKey(parsedKey.material, {
    family: spec.family,
    algs: [input.alg],
    kid,
    curve: spec.curve,
    use: 'sig',
    ops: ['sign'],
    needsPrivate: true,
  });
  if (typeof jwk === 'string') return keyError(jwk);

  const secretLength = octBytes(jwk)?.length ?? null;
  if (secretLength !== null && secretLength < spec.hashBytes) {
    warnings.push({ code: 'weak-secret', bytes: secretLength, minimum: spec.hashBytes });
  }
  try {
    const signature = await signJws(input.alg, jwk, utf8(signingInput));
    return { ok: true, token: `${signingInput}.${bytesToBase64Url(signature)}`, warnings };
  } catch {
    return keyError('key-invalid');
  }
}

export function applyTimeClaims(
  payload: string,
  claims: Partial<Record<'iat' | 'nbf' | 'exp', number>>,
): string | null {
  const parsed = payload.trim() === '' ? { ok: true as const, value: {} } : parseJsonValue(payload);
  if (!parsed.ok || !isObject(parsed.value)) return null;
  return JSON.stringify({ ...parsed.value, ...claims }, null, 2);
}
