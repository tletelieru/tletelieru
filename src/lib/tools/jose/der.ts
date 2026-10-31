import { fromHex, type Bytes } from '../hash';
import { concatBytes } from './encoding';

export class DerError extends Error {}

export const DerTag = {
  integer: 0x02,
  bitString: 0x03,
  octetString: 0x04,
  oid: 0x06,
  sequence: 0x30,
} as const;

export interface Tlv {
  tag: number;
  value: Bytes;
}

interface ReadTlv extends Tlv {
  next: number;
}

export function readTlv(bytes: Bytes, offset: number): ReadTlv {
  const tag = bytes[offset];
  const first = bytes[offset + 1];
  if (tag === undefined || first === undefined) throw new DerError('truncated');
  let start = offset + 2;
  let length = first;
  if (first >= 0x80) {
    const count = first & 0x7f;
    if (count === 0 || count > 4) throw new DerError('length');
    length = 0;
    for (let index = 0; index < count; index++) {
      const byte = bytes[start + index];
      if (byte === undefined) throw new DerError('truncated');
      length = length * 256 + byte;
    }
    start += count;
  }
  const end = start + length;
  if (end > bytes.length) throw new DerError('truncated');
  return { tag, value: bytes.subarray(start, end), next: end };
}

export function readChildren(tlv: Tlv): Tlv[] {
  const items: Tlv[] = [];
  let offset = 0;
  while (offset < tlv.value.length) {
    const item = readTlv(tlv.value, offset);
    items.push({ tag: item.tag, value: item.value });
    offset = item.next;
  }
  return items;
}

export function readRoot(bytes: Bytes): Tlv {
  const root = readTlv(bytes, 0);
  if (root.tag !== DerTag.sequence || root.next !== bytes.length) throw new DerError('root');
  return root;
}

export function expectTag(item: Tlv | undefined, tag: number): Bytes {
  if (item?.tag !== tag) throw new DerError('tag');
  return item.value;
}

export function trimInteger(value: Bytes): Bytes {
  let start = 0;
  while (start < value.length - 1 && value[start] === 0) start++;
  return value.subarray(start);
}

export function readBitString(item: Tlv | undefined): Bytes {
  const value = expectTag(item, DerTag.bitString);
  if (value[0] !== 0) throw new DerError('bit-string');
  return value.subarray(1);
}

function encodeLength(length: number): number[] {
  if (length < 0x80) return [length];
  const out: number[] = [];
  for (let rest = length; rest > 0; rest = Math.floor(rest / 256)) out.unshift(rest % 256);
  return [0x80 | out.length, ...out];
}

function tlv(tag: number, ...parts: readonly Uint8Array[]): Bytes {
  const body = concatBytes(...parts);
  return concatBytes(Uint8Array.from([tag, ...encodeLength(body.length)]), body);
}

export function derSequence(...parts: readonly Uint8Array[]): Bytes {
  return tlv(DerTag.sequence, ...parts);
}

export function derOctets(bytes: Uint8Array): Bytes {
  return tlv(DerTag.octetString, bytes);
}

export function derBits(bytes: Uint8Array): Bytes {
  return tlv(DerTag.bitString, Uint8Array.of(0), bytes);
}

export function derNull(): Bytes {
  return tlv(0x05);
}

export function derContext(index: number, ...parts: readonly Uint8Array[]): Bytes {
  return tlv(0xa0 | index, ...parts);
}

export function derOid(hex: string): Bytes {
  return tlv(DerTag.oid, fromHex(hex) ?? new Uint8Array());
}

export function derInteger(value: Uint8Array): Bytes {
  const trimmed = trimInteger(new Uint8Array(value));
  const high = (trimmed[0] ?? 0) >= 0x80;
  return tlv(DerTag.integer, high ? Uint8Array.of(0) : new Uint8Array(), trimmed);
}

export function derSmallInt(value: number): Bytes {
  return derInteger(Uint8Array.of(value));
}
