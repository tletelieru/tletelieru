export type IdType = 'v4' | 'v7' | 'ulid' | 'nanoid';

export const idTypes: readonly IdType[] = ['v4', 'v7', 'ulid', 'nanoid'];

export type IdCase = 'default' | 'lower' | 'upper';

export const idCases: readonly IdCase[] = ['default', 'lower', 'upper'];

export type RandomBytes = (length: number) => Uint8Array;

export const cryptoBytes: RandomBytes = (length) => crypto.getRandomValues(new Uint8Array(length));

export const NANOID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';

export const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export interface IdGenerateOptions {
  type?: IdType;
  count?: number;
  monotonic?: boolean;
  size?: number;
  alphabet?: string;
}

export interface IdFormatOptions {
  letterCase?: IdCase;
  hyphens?: boolean;
}

export type NanoidError = 'alphabetTooShort' | 'alphabetTooLong' | 'alphabetDuplicate' | 'size';

export type IdGenerateResult = { ok: true; ids: string[] } | { ok: false; error: NanoidError };

const UUID_HEX = /^[0-9a-f]{32}$/;
const ULID_SHAPE = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;
const GREGORIAN_OFFSET = 0x01b21dd213814000n;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function hyphenate(hex: string): string {
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function setVersion(bytes: Uint8Array, version: number): Uint8Array {
  bytes[6] = (bytes[6] & 0x0f) | (version << 4);
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytes;
}

function writeTime48(bytes: Uint8Array, ms: number): void {
  let rest = Math.max(0, Math.floor(ms));
  for (let index = 5; index >= 0; index--) {
    bytes[index] = rest % 256;
    rest = Math.floor(rest / 256);
  }
}

export function uuidV4(random: RandomBytes = cryptoBytes): string {
  return hyphenate(toHex(setVersion(Uint8Array.from(random(16)), 4)));
}

export function uuidV7(now: number = Date.now(), random: RandomBytes = cryptoBytes): string {
  const bytes = new Uint8Array(16);
  bytes.set(random(10).subarray(0, 10), 6);
  writeTime48(bytes, now);
  return hyphenate(toHex(setVersion(bytes, 7)));
}

function encodeUlidTime(ms: number): string {
  let rest = Math.max(0, Math.floor(ms));
  let out = '';
  for (let index = 0; index < 10; index++) {
    out = CROCKFORD[rest % 32] + out;
    rest = Math.floor(rest / 32);
  }
  return out;
}

function encodeUlidRandom(bytes: Uint8Array): string {
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += CROCKFORD[(buffer >> bits) & 31];
    }
    buffer &= (1 << bits) - 1;
  }
  return out;
}

function increment(bytes: Uint8Array): Uint8Array {
  const next = Uint8Array.from(bytes);
  for (let index = next.length - 1; index >= 0; index--) {
    if (next[index] < 255) {
      next[index] += 1;
      return next;
    }
    next[index] = 0;
  }
  return next;
}

export function generateUlids(
  count: number,
  { monotonic = true, now = Date.now() }: { monotonic?: boolean; now?: number } = {},
  random: RandomBytes = cryptoBytes,
): string[] {
  const time = encodeUlidTime(now);
  const ids: string[] = [];
  let previous: Uint8Array | null = null;
  for (let index = 0; index < count; index++) {
    const entropy: Uint8Array =
      monotonic && previous ? increment(previous) : Uint8Array.from(random(10).subarray(0, 10));
    previous = entropy;
    ids.push(time + encodeUlidRandom(entropy));
  }
  return ids;
}

export function ulid(now: number = Date.now(), random: RandomBytes = cryptoBytes): string {
  return generateUlids(1, { now }, random)[0];
}

export function validateNanoidAlphabet(alphabet: string): NanoidError | null {
  const chars = Array.from(alphabet);
  if (chars.length < 2) return 'alphabetTooShort';
  if (chars.length > 256) return 'alphabetTooLong';
  if (new Set(chars).size !== chars.length) return 'alphabetDuplicate';
  return null;
}

export function nanoid(
  size = 21,
  alphabet: string = NANOID_ALPHABET,
  random: RandomBytes = cryptoBytes,
): string {
  const chars = Array.from(alphabet);
  const mask = (2 << (31 - Math.clz32((chars.length - 1) | 1))) - 1;
  const step = Math.ceil((1.6 * mask * size) / chars.length);
  let id = '';
  let produced = 0;
  while (produced < size) {
    const bytes = random(step);
    for (let index = 0; index < step && produced < size; index++) {
      const char = chars[bytes[index] & mask];
      if (char !== undefined) {
        id += char;
        produced++;
      }
    }
  }
  return id;
}

export function generateIds(
  {
    type = 'v4',
    count = 1,
    monotonic = true,
    size = 21,
    alphabet = NANOID_ALPHABET,
  }: IdGenerateOptions = {},
  random: RandomBytes = cryptoBytes,
  now: number = Date.now(),
): IdGenerateResult {
  if (type === 'ulid') return { ok: true, ids: generateUlids(count, { monotonic, now }, random) };
  if (type === 'nanoid') {
    const error = validateNanoidAlphabet(alphabet);
    if (error) return { ok: false, error };
    if (!Number.isInteger(size) || size < 1 || size > 256) return { ok: false, error: 'size' };
    return { ok: true, ids: Array.from({ length: count }, () => nanoid(size, alphabet, random)) };
  }
  const make = type === 'v7' ? () => uuidV7(now, random) : () => uuidV4(random);
  return { ok: true, ids: Array.from({ length: count }, make) };
}

export function formatId(
  id: string,
  type: IdType,
  { letterCase = 'default', hyphens = true }: IdFormatOptions = {},
): string {
  if (type === 'nanoid') return id;
  const shaped = type === 'ulid' || hyphens ? id : id.replace(/-/g, '');
  if (letterCase === 'upper') return shaped.toUpperCase();
  if (letterCase === 'lower') return shaped.toLowerCase();
  return type === 'ulid' ? shaped.toUpperCase() : shaped.toLowerCase();
}

export type UuidVariant = 'ncs' | 'rfc9562' | 'microsoft' | 'future';

export interface IdTime {
  ms: number;
  iso: string;
}

export type IdInspection =
  | { kind: 'nil' | 'max'; canonical: string }
  | { kind: 'uuid'; canonical: string; version: number; variant: UuidVariant; time?: IdTime }
  | { kind: 'ulid'; canonical: string; time: IdTime }
  | { kind: 'invalid' };

function toTime(ms: number): IdTime | undefined {
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? undefined : { ms, iso: date.toISOString() };
}

function variantOf(nibble: number): UuidVariant {
  if (nibble < 8) return 'ncs';
  if (nibble < 12) return 'rfc9562';
  if (nibble < 14) return 'microsoft';
  return 'future';
}

function gregorianToMs(ticks: bigint): number {
  return Number((ticks - GREGORIAN_OFFSET) / 10000n);
}

function uuidTime(hex: string, version: number): IdTime | undefined {
  if (version === 7) return toTime(parseInt(hex.slice(0, 12), 16));
  if (version === 1) {
    const ticks = BigInt(`0x${hex.slice(13, 16)}${hex.slice(8, 12)}${hex.slice(0, 8)}`);
    return toTime(gregorianToMs(ticks));
  }
  if (version === 6) {
    const ticks = BigInt(`0x${hex.slice(0, 12)}${hex.slice(13, 16)}`);
    return toTime(gregorianToMs(ticks));
  }
  return undefined;
}

export function decodeUlidTime(id: string): number {
  let ms = 0;
  for (const char of id.slice(0, 10).toUpperCase()) ms = ms * 32 + CROCKFORD.indexOf(char);
  return ms;
}

function inspectUuid(input: string): IdInspection | null {
  const stripped = input
    .replace(/^urn:uuid:/i, '')
    .replace(/^\{(.*)\}$/, '$1')
    .toLowerCase();
  const shaped = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(stripped)
    ? stripped.replace(/-/g, '')
    : stripped;
  if (!UUID_HEX.test(shaped)) return null;
  const canonical = hyphenate(shaped);
  if (/^0+$/.test(shaped)) return { kind: 'nil', canonical };
  if (/^f+$/.test(shaped)) return { kind: 'max', canonical };
  const version = parseInt(shaped[12], 16);
  const variant = variantOf(parseInt(shaped[16], 16));
  const time = variant === 'rfc9562' ? uuidTime(shaped, version) : undefined;
  return time
    ? { kind: 'uuid', canonical, version, variant, time }
    : { kind: 'uuid', canonical, version, variant };
}

export function inspectId(input: string): IdInspection {
  const trimmed = input.trim();
  const uuid = inspectUuid(trimmed);
  if (uuid) return uuid;
  const upper = trimmed.toUpperCase();
  if (ULID_SHAPE.test(upper)) {
    const time = toTime(decodeUlidTime(upper));
    if (time) return { kind: 'ulid', canonical: upper, time };
  }
  return { kind: 'invalid' };
}
