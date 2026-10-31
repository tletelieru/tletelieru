import { fromBase64, toBase64, toHex, type Bytes } from '../hash';
import { curveBytes, isCurve, type Curve } from './algorithms';
import {
  DerError,
  DerTag,
  derBits,
  derContext,
  derInteger,
  derNull,
  derOctets,
  derOid,
  derSequence,
  derSmallInt,
  expectTag,
  readBitString,
  readChildren,
  readRoot,
  trimInteger,
  type Tlv,
} from './der';
import { base64UrlToBytes, bytesToBase64Url, concatBytes } from './encoding';

export interface Jwk {
  kty: string;
  kid?: string;
  alg?: string;
  use?: string;
  key_ops?: string[];
  crv?: string;
  x?: string;
  y?: string;
  d?: string;
  n?: string;
  e?: string;
  p?: string;
  q?: string;
  dp?: string;
  dq?: string;
  qi?: string;
  k?: string;
}

export type PemError = 'pem-malformed' | 'pem-encrypted' | 'pem-unsupported' | 'key-unsupported';

export type PemResult = { ok: true; jwk: Jwk } | { ok: false; error: PemError };

const OID_RSA = '2a864886f70d010101';
const OID_EC = '2a8648ce3d0201';

const CURVE_OIDS: Record<Curve, string> = {
  'P-256': '2a8648ce3d030107',
  'P-384': '2b81040022',
  'P-521': '2b81040023',
};

const PEM_BLOCK = /-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/g;

function integer(item: Tlv | undefined): string {
  return bytesToBase64Url(trimInteger(expectTag(item, DerTag.integer)));
}

function curveFromOid(hex: string): Curve | null {
  return (Object.keys(CURVE_OIDS) as Curve[]).find((curve) => CURVE_OIDS[curve] === hex) ?? null;
}

function rsaPublic(bytes: Bytes): Jwk {
  const [n, e] = readChildren(readRoot(bytes));
  return { kty: 'RSA', n: integer(n), e: integer(e) };
}

function rsaPrivate(bytes: Bytes): Jwk {
  const items = readChildren(readRoot(bytes));
  if (integer(items[0]) !== 'AA') throw new DerError('version');
  const [, n, e, d, p, q, dp, dq, qi] = items;
  return {
    kty: 'RSA',
    n: integer(n),
    e: integer(e),
    d: integer(d),
    p: integer(p),
    q: integer(q),
    dp: integer(dp),
    dq: integer(dq),
    qi: integer(qi),
  };
}

function ecPoint(point: Bytes, curve: Curve): Jwk | null {
  const size = curveBytes[curve];
  if (point[0] !== 0x04 || point.length !== 1 + 2 * size) return null;
  return {
    kty: 'EC',
    crv: curve,
    x: bytesToBase64Url(point.subarray(1, 1 + size)),
    y: bytesToBase64Url(point.subarray(1 + size)),
  };
}

function ecPrivate(bytes: Bytes, outerCurve: Curve | null): Jwk | null {
  const items = readChildren(readRoot(bytes));
  const secret = expectTag(items[1], DerTag.octetString);
  const parameters = items.find((item) => item.tag === 0xa0);
  const publicKey = items.find((item) => item.tag === 0xa1);
  const inner = parameters
    ? curveFromOid(toHex(expectTag(readChildren(parameters)[0], DerTag.oid)))
    : null;
  const curve = outerCurve ?? inner;
  if (!curve || !publicKey) return null;
  const size = curveBytes[curve];
  if (secret.length > size) throw new DerError('secret');
  const point = ecPoint(readBitString(readChildren(publicKey)[0]), curve);
  if (!point) return null;
  const padded = concatBytes(new Uint8Array(size - secret.length), secret);
  return { ...point, d: bytesToBase64Url(padded) };
}

function readAlgorithm(item: Tlv | undefined): { oid: string; curve: Curve | null } {
  const value = expectTag(item, DerTag.sequence);
  const [oid, parameter] = readChildren({ tag: DerTag.sequence, value });
  return {
    oid: toHex(expectTag(oid, DerTag.oid)),
    curve: parameter?.tag === DerTag.oid ? curveFromOid(toHex(parameter.value)) : null,
  };
}

function spkiToJwk(bytes: Bytes): Jwk | null {
  const [algorithm, key] = readChildren(readRoot(bytes));
  const { oid, curve } = readAlgorithm(algorithm);
  const point = readBitString(key);
  if (oid === OID_RSA) return rsaPublic(point);
  if (oid === OID_EC && curve) return ecPoint(point, curve);
  return null;
}

function pkcs8ToJwk(bytes: Bytes): Jwk | null {
  const [, algorithm, key] = readChildren(readRoot(bytes));
  const { oid, curve } = readAlgorithm(algorithm);
  const inner = expectTag(key, DerTag.octetString);
  if (oid === OID_RSA) return rsaPrivate(inner);
  if (oid === OID_EC && curve) return ecPrivate(inner, curve);
  return null;
}

const readers: Record<string, (bytes: Bytes) => Jwk | null> = {
  'PUBLIC KEY': spkiToJwk,
  'PRIVATE KEY': pkcs8ToJwk,
  'RSA PUBLIC KEY': rsaPublic,
  'RSA PRIVATE KEY': rsaPrivate,
  'EC PRIVATE KEY': (bytes) => ecPrivate(bytes, null),
};

export function pemToJwk(text: string): PemResult {
  const blocks = [...text.matchAll(PEM_BLOCK)].filter((block) => block[1] !== 'EC PARAMETERS');
  const block = blocks[0];
  if (!block) return { ok: false, error: 'pem-malformed' };
  const [, label = '', body = ''] = block;
  if (label === 'ENCRYPTED PRIVATE KEY' || /Proc-Type:.*ENCRYPTED/.test(body)) {
    return { ok: false, error: 'pem-encrypted' };
  }
  const reader = readers[label];
  if (!reader) return { ok: false, error: 'pem-unsupported' };
  const bytes = fromBase64(body);
  if (!bytes || bytes.length === 0) return { ok: false, error: 'pem-malformed' };
  try {
    const jwk = reader(bytes);
    return jwk ? { ok: true, jwk } : { ok: false, error: 'key-unsupported' };
  } catch (error) {
    if (error instanceof DerError) return { ok: false, error: 'pem-malformed' };
    throw error;
  }
}

function field(value: string | undefined): Bytes {
  const bytes = value === undefined ? null : base64UrlToBytes(value);
  if (!bytes) throw new DerError('field');
  return bytes;
}

function wrapPem(label: string, der: Uint8Array): string {
  const lines = toBase64(der).match(/.{1,64}/g) ?? [];
  return [`-----BEGIN ${label}-----`, ...lines, `-----END ${label}-----`].join('\n');
}

function ecCurve(jwk: Jwk): Curve {
  if (!isCurve(jwk.crv)) throw new DerError('curve');
  return jwk.crv;
}

function ecPointBytes(jwk: Jwk): Bytes {
  return concatBytes(Uint8Array.of(4), field(jwk.x), field(jwk.y));
}

function publicDer(jwk: Jwk): Bytes {
  if (jwk.kty === 'RSA') {
    const key = derSequence(derInteger(field(jwk.n)), derInteger(field(jwk.e)));
    return derSequence(derSequence(derOid(OID_RSA), derNull()), derBits(key));
  }
  const algorithm = derSequence(derOid(OID_EC), derOid(CURVE_OIDS[ecCurve(jwk)]));
  return derSequence(algorithm, derBits(ecPointBytes(jwk)));
}

function privateDer(jwk: Jwk): Bytes {
  if (jwk.kty === 'RSA') {
    const parts = [jwk.n, jwk.e, jwk.d, jwk.p, jwk.q, jwk.dp, jwk.dq, jwk.qi];
    const inner = derSequence(derSmallInt(0), ...parts.map((part) => derInteger(field(part))));
    return derSequence(derSmallInt(0), derSequence(derOid(OID_RSA), derNull()), derOctets(inner));
  }
  const inner = derSequence(
    derSmallInt(1),
    derOctets(field(jwk.d)),
    derContext(1, derBits(ecPointBytes(jwk))),
  );
  return derSequence(
    derSmallInt(0),
    derSequence(derOid(OID_EC), derOid(CURVE_OIDS[ecCurve(jwk)])),
    derOctets(inner),
  );
}

export function jwkToPem(jwk: Jwk, part: 'public' | 'private'): string | null {
  if (jwk.kty !== 'RSA' && jwk.kty !== 'EC') return null;
  try {
    return part === 'public'
      ? wrapPem('PUBLIC KEY', publicDer(jwk))
      : wrapPem('PRIVATE KEY', privateDer(jwk));
  } catch (error) {
    if (error instanceof DerError) return null;
    throw error;
  }
}
