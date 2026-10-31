export const hmacAlgs = ['HS256', 'HS384', 'HS512'] as const;
export const rsaAlgs = ['RS256', 'RS384', 'RS512'] as const;
export const pssAlgs = ['PS256', 'PS384', 'PS512'] as const;
export const ecdsaAlgs = ['ES256', 'ES384', 'ES512'] as const;
export const jwsAlgs = [...hmacAlgs, ...rsaAlgs, ...pssAlgs, ...ecdsaAlgs] as const;
export type JwsAlg = (typeof jwsAlgs)[number];

export const curves = ['P-256', 'P-384', 'P-521'] as const;
export type Curve = (typeof curves)[number];

export type KeyFamily = 'oct' | 'RSA' | 'EC';

export const MIN_RSA_BITS = 2048;

export const curveBytes: Record<Curve, number> = { 'P-256': 32, 'P-384': 48, 'P-521': 66 };

type HashName = 'SHA-256' | 'SHA-384' | 'SHA-512';

interface JwsSpec {
  family: KeyFamily;
  webCrypto: 'HMAC' | 'RSASSA-PKCS1-v1_5' | 'RSA-PSS' | 'ECDSA';
  hash: HashName;
  hashBytes: number;
  curve: Curve | null;
}

function spec(
  family: KeyFamily,
  webCrypto: JwsSpec['webCrypto'],
  bits: 256 | 384 | 512,
  curve: Curve | null = null,
): JwsSpec {
  return { family, webCrypto, hash: `SHA-${bits}`, hashBytes: bits / 8, curve };
}

export const jwsSpecs: Record<JwsAlg, JwsSpec> = {
  HS256: spec('oct', 'HMAC', 256),
  HS384: spec('oct', 'HMAC', 384),
  HS512: spec('oct', 'HMAC', 512),
  RS256: spec('RSA', 'RSASSA-PKCS1-v1_5', 256),
  RS384: spec('RSA', 'RSASSA-PKCS1-v1_5', 384),
  RS512: spec('RSA', 'RSASSA-PKCS1-v1_5', 512),
  PS256: spec('RSA', 'RSA-PSS', 256),
  PS384: spec('RSA', 'RSA-PSS', 384),
  PS512: spec('RSA', 'RSA-PSS', 512),
  ES256: spec('EC', 'ECDSA', 256, 'P-256'),
  ES384: spec('EC', 'ECDSA', 384, 'P-384'),
  ES512: spec('EC', 'ECDSA', 512, 'P-521'),
};

export function isJwsAlg(value: unknown): value is JwsAlg {
  return typeof value === 'string' && (jwsAlgs as readonly string[]).includes(value);
}

export function isCurve(value: unknown): value is Curve {
  return typeof value === 'string' && (curves as readonly string[]).includes(value);
}
