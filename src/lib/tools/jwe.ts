import { stringifyJson, parseJson, type JsonError } from './json';
import { toBase64, utf8, type Bytes, type KeyEncoding } from './hash';
import { base64UrlToBytes, concatBytes, isObject } from './jose/encoding';
import { bareJwk } from './jose/jws';
import {
  octBytes,
  parseKeyMaterial,
  selectKey,
  type Jwk,
  type KeyFailure,
  type KeyRequirement,
} from './jose/keys';
import { decodeJwt, normalizeToken, type JwtDecoded } from './jwt';

export const jweKeyAlgs = ['dir', 'A128KW', 'A256KW', 'RSA-OAEP', 'RSA-OAEP-256'] as const;
export type JweKeyAlg = (typeof jweKeyAlgs)[number];

export const jweEncs = ['A128GCM', 'A256GCM'] as const;
export type JweEnc = (typeof jweEncs)[number];

export const jweParts = ['protected', 'encryptedKey', 'iv', 'ciphertext', 'tag'] as const;
export type JwePart = (typeof jweParts)[number];

export type JweError =
  | { code: 'empty' }
  | { code: 'jws' }
  | { code: 'segments'; count: number }
  | { code: 'base64'; part: JwePart }
  | { code: 'utf8' }
  | { code: 'json'; detail: JsonError }
  | { code: 'not-object' }
  | { code: 'missing-alg' }
  | { code: 'missing-enc' };

export type JweSupport =
  | { supported: true; alg: JweKeyAlg; enc: JweEnc }
  | { supported: false; field: 'alg' | 'enc' | 'zip' | 'crit'; value: string };

export interface JweInspection {
  raw: Record<JwePart, string>;
  bytes: Record<JwePart, Bytes>;
  header: Record<string, unknown>;
  headerJson: string;
  alg: string;
  enc: string;
  kid: string | null;
  nestedHint: boolean;
  support: JweSupport;
}

export type JweInspectResult = { ok: true; jwe: JweInspection } | { ok: false; error: JweError };

export type JweFailure =
  | KeyFailure
  | 'unsupported'
  | 'encrypted-key-present'
  | 'cek-size'
  | 'iv-size'
  | 'tag-size'
  | 'decrypt';

export type JweDecryptResult =
  | { ok: true; text: string; binary: boolean; nested: JwtDecoded | null }
  | { ok: false; failure: JweFailure };

const ENC_BYTES: Record<JweEnc, number> = { A128GCM: 16, A256GCM: 32 };
const KW_BYTES: Record<'A128KW' | 'A256KW', number> = { A128KW: 16, A256KW: 32 };
const OAEP_HASH: Record<'RSA-OAEP' | 'RSA-OAEP-256', string> = {
  'RSA-OAEP': 'SHA-1',
  'RSA-OAEP-256': 'SHA-256',
};

const IV_BYTES = 12;
const TAG_BYTES = 16;
const WRAP_OVERHEAD = 8;

function isKeyAlg(value: string): value is JweKeyAlg {
  return (jweKeyAlgs as readonly string[]).includes(value);
}

function isEnc(value: string): value is JweEnc {
  return (jweEncs as readonly string[]).includes(value);
}

function assessSupport(header: Record<string, unknown>, alg: string, enc: string): JweSupport {
  if (!isKeyAlg(alg)) return { supported: false, field: 'alg', value: alg };
  if (!isEnc(enc)) return { supported: false, field: 'enc', value: enc };
  if (header.zip !== undefined) {
    return { supported: false, field: 'zip', value: String(header.zip) };
  }
  if (header.crit !== undefined) {
    return { supported: false, field: 'crit', value: JSON.stringify(header.crit) };
  }
  return { supported: true, alg, enc };
}

export function inspectJwe(input: string): JweInspectResult {
  const token = normalizeToken(input);
  if (token === '') return { ok: false, error: { code: 'empty' } };
  const segments = token.split('.');
  if (segments.length === 3) return { ok: false, error: { code: 'jws' } };
  if (segments.length !== 5) {
    return { ok: false, error: { code: 'segments', count: segments.length } };
  }
  const raw = Object.fromEntries(
    jweParts.map((part, index) => [part, segments[index] ?? '']),
  ) as Record<JwePart, string>;
  const decoded: Partial<Record<JwePart, Bytes>> = {};
  for (const part of jweParts) {
    const bytes = base64UrlToBytes(raw[part]);
    if (!bytes) return { ok: false, error: { code: 'base64', part } };
    decoded[part] = bytes;
  }
  const bytes = decoded as Record<JwePart, Bytes>;

  let headerText: string;
  try {
    headerText = new TextDecoder('utf-8', { fatal: true }).decode(bytes.protected);
  } catch {
    return { ok: false, error: { code: 'utf8' } };
  }
  const parsed = parseJson(headerText);
  if (!parsed.ok) return { ok: false, error: { code: 'json', detail: parsed.error } };
  const header: unknown = JSON.parse(headerText);
  if (!isObject(header)) return { ok: false, error: { code: 'not-object' } };
  if (typeof header.alg !== 'string') return { ok: false, error: { code: 'missing-alg' } };
  if (typeof header.enc !== 'string') return { ok: false, error: { code: 'missing-enc' } };

  const contentType = typeof header.cty === 'string' ? header.cty.toLowerCase() : '';
  return {
    ok: true,
    jwe: {
      raw,
      bytes,
      header,
      headerJson: stringifyJson(parsed.value, { indent: '2' }),
      alg: header.alg,
      enc: header.enc,
      kid: typeof header.kid === 'string' ? header.kid : null,
      nestedHint: contentType === 'jwt' || contentType === 'application/jwt',
      support: assessSupport(header, header.alg, header.enc),
    },
  };
}

function keyRequirement(alg: JweKeyAlg, enc: JweEnc, kid: string | null): KeyRequirement {
  if (alg === 'dir') {
    return { family: 'oct', algs: [alg, enc], kid, use: 'enc', ops: ['decrypt'] };
  }
  if (alg === 'A128KW' || alg === 'A256KW') {
    return { family: 'oct', algs: [alg], kid, use: 'enc', ops: ['unwrapKey'] };
  }
  return {
    family: 'RSA',
    algs: [alg],
    kid,
    use: 'enc',
    ops: ['unwrapKey', 'decrypt'],
    needsPrivate: true,
  };
}

function importAes(raw: Bytes, usage: KeyUsage, name: 'AES-GCM' | 'AES-KW'): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, { name }, false, [usage]);
}

async function deriveCek(
  jwe: JweInspection,
  alg: JweKeyAlg,
  enc: JweEnc,
  jwk: Jwk,
): Promise<CryptoKey | JweFailure> {
  const wrapped = jwe.bytes.encryptedKey;
  const cekBytes = ENC_BYTES[enc];
  if (alg === 'dir') {
    if (wrapped.length > 0) return 'encrypted-key-present';
    const raw = octBytes(jwk);
    if (!raw || raw.length !== cekBytes) return 'cek-size';
    return importAes(raw, 'decrypt', 'AES-GCM');
  }
  if (alg === 'A128KW' || alg === 'A256KW') {
    const raw = octBytes(jwk);
    if (!raw || raw.length !== KW_BYTES[alg] || wrapped.length !== cekBytes + WRAP_OVERHEAD) {
      return 'cek-size';
    }
    const kek = await importAes(raw, 'unwrapKey', 'AES-KW');
    return crypto.subtle.unwrapKey('raw', wrapped, kek, 'AES-KW', 'AES-GCM', false, ['decrypt']);
  }
  const key = await crypto.subtle.importKey(
    'jwk',
    bareJwk(jwk, 'private'),
    { name: 'RSA-OAEP', hash: OAEP_HASH[alg] },
    false,
    ['decrypt'],
  );
  const cek = new Uint8Array(await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, key, wrapped));
  if (cek.length !== cekBytes) return 'cek-size';
  return importAes(cek, 'decrypt', 'AES-GCM');
}

function readPlaintext(plaintext: Bytes): JweDecryptResult {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(plaintext);
  } catch {
    return { ok: true, text: toBase64(plaintext), binary: true, nested: null };
  }
  const nested = decodeJwt(text, 0);
  return { ok: true, text, binary: false, nested: nested.ok ? nested.jwt : null };
}

export async function decryptJwe(
  jwe: JweInspection,
  keyText: string,
  encoding: KeyEncoding,
): Promise<JweDecryptResult> {
  const fail = (failure: JweFailure): JweDecryptResult => ({ ok: false, failure });
  if (!jwe.support.supported) return fail('unsupported');
  const { alg, enc } = jwe.support;
  const parsed = parseKeyMaterial(keyText, encoding);
  if (!parsed.ok) return fail(parsed.error);
  const jwk = selectKey(parsed.material, keyRequirement(alg, enc, jwe.kid));
  if (typeof jwk === 'string') return fail(jwk);
  if (jwe.bytes.iv.length !== IV_BYTES) return fail('iv-size');
  if (jwe.bytes.tag.length !== TAG_BYTES) return fail('tag-size');

  try {
    const cek = await deriveCek(jwe, alg, enc, jwk);
    if (typeof cek === 'string') return fail(cek);
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: jwe.bytes.iv,
        additionalData: utf8(jwe.raw.protected),
        tagLength: TAG_BYTES * 8,
      },
      cek,
      concatBytes(jwe.bytes.ciphertext, jwe.bytes.tag),
    );
    return readPlaintext(new Uint8Array(plaintext));
  } catch {
    return fail('decrypt');
  }
}
