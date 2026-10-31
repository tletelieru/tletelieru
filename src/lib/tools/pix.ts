import { compare, formatDecimal, parseDecimal, round, ZERO } from './_shared/decimal';
import { validateCnpj } from './cnpj';
import { validateCpf } from './cpf';
import { utf8 } from './hash';

export const pixModes = ['parse', 'generate', 'key'] as const;
export type PixMode = (typeof pixModes)[number];

export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'evp';

export interface TlvItem {
  tag: string;
  value: string;
}

export interface PixCode {
  gui: string;
  key: string;
  description: string;
  url: string;
  payloadFormat: string;
  initiation: string;
  category: string;
  currency: string;
  amount: string;
  country: string;
  name: string;
  city: string;
  txid: string;
  crc: string;
  expectedCrc: string;
  crcValid: boolean;
}

export type PixParseError = 'tlv' | 'crcMissing' | 'notPix';

export type PixParseResult = { ok: true; code: PixCode } | { ok: false; error: PixParseError };

export type PixBuildError = 'key' | 'name' | 'city' | 'amount' | 'txid' | 'tooLong';

export type PixBuildResult = { ok: true; code: string } | { ok: false; error: PixBuildError };

export interface PixBuildInput {
  key: string;
  name: string;
  city: string;
  amount: string;
  txid: string;
  description: string;
}

export interface PixKeyReport {
  type: PixKeyType | null;
  valid: boolean;
  normalized: string;
}

const GUI = 'br.gov.bcb.pix';
const EVP = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL = 77;
const MAX_TEMPLATE = 99;

export function crc16(text: string): string {
  let crc = 0xffff;
  for (const byte of utf8(text)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function parseTlv(text: string): TlvItem[] | null {
  const chars = Array.from(text);
  const items: TlvItem[] = [];
  let index = 0;
  while (index < chars.length) {
    const tag = chars.slice(index, index + 2).join('');
    const size = chars.slice(index + 2, index + 4).join('');
    if (!/^\d{2}$/.test(tag) || !/^\d{2}$/.test(size)) return null;
    const end = index + 4 + Number(size);
    if (end > chars.length) return null;
    items.push({ tag, value: chars.slice(index + 4, end).join('') });
    index = end;
  }
  return items;
}

function field(items: readonly TlvItem[], tag: string): string {
  return items.find((item) => item.tag === tag)?.value ?? '';
}

export function parsePix(input: string): PixParseResult {
  const text = input.trim();
  const items = parseTlv(text);
  if (!items) return { ok: false, error: 'tlv' };
  const crc = field(items, '63');
  if (crc === '' || !text.endsWith(crc)) return { ok: false, error: 'crcMissing' };
  const account = items.find((item) => {
    if (Number(item.tag) < 26 || Number(item.tag) > 51) return false;
    const nested = parseTlv(item.value);
    return nested !== null && field(nested, '00').toLowerCase() === GUI;
  });
  const merchant = account ? parseTlv(account.value) : null;
  if (!merchant) return { ok: false, error: 'notPix' };
  const additional = parseTlv(field(items, '62')) ?? [];
  const expectedCrc = crc16(text.slice(0, -crc.length));
  return {
    ok: true,
    code: {
      gui: field(merchant, '00'),
      key: field(merchant, '01'),
      description: field(merchant, '02'),
      url: field(merchant, '25'),
      payloadFormat: field(items, '00'),
      initiation: field(items, '01'),
      category: field(items, '52'),
      currency: field(items, '53'),
      amount: field(items, '54'),
      country: field(items, '58'),
      name: field(items, '59'),
      city: field(items, '60'),
      txid: field(additional, '05'),
      crc: crc.toUpperCase(),
      expectedCrc,
      crcValid: crc.toUpperCase() === expectedCrc,
    },
  };
}

export function validatePixKey(input: string): PixKeyReport {
  const text = input.trim();
  if (text.startsWith('+')) {
    return { type: 'phone', valid: /^\+55\d{10,11}$/.test(text), normalized: text };
  }
  if (text.includes('@')) {
    const normalized = text.toLowerCase();
    return {
      type: 'email',
      valid: EMAIL.test(normalized) && normalized.length <= MAX_EMAIL,
      normalized,
    };
  }
  if (EVP.test(text)) return { type: 'evp', valid: true, normalized: text.toLowerCase() };
  const compact = text.replace(/[.\-/\s]/g, '').toUpperCase();
  if (/^\d{11}$/.test(compact)) {
    return { type: 'cpf', valid: validateCpf(compact).valid, normalized: compact };
  }
  if (/^[0-9A-Z]{12}\d{2}$/.test(compact)) {
    return { type: 'cnpj', valid: validateCnpj(compact).valid, normalized: compact };
  }
  return { type: null, valid: false, normalized: text };
}

function ascii(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\x20-\x7e]/g, '')
    .trim();
}

function tlv(tag: string, value: string): string {
  return `${tag}${String(value.length).padStart(2, '0')}${value}`;
}

export function buildPix(input: PixBuildInput): PixBuildResult {
  const key = validatePixKey(input.key);
  if (!key.valid) return { ok: false, error: 'key' };
  const name = ascii(input.name).slice(0, 25);
  if (name === '') return { ok: false, error: 'name' };
  const city = ascii(input.city).slice(0, 15);
  if (city === '') return { ok: false, error: 'city' };
  const txid = input.txid.trim() || '***';
  if (txid !== '***' && !/^[A-Za-z0-9]{1,25}$/.test(txid)) return { ok: false, error: 'txid' };

  let amount = '';
  if (input.amount.trim() !== '') {
    const value = parseDecimal(input.amount);
    if (!value || compare(value, ZERO) <= 0 || value.scale > 2) {
      return { ok: false, error: 'amount' };
    }
    amount = formatDecimal(round(value, 2));
    if (amount.length > 13) return { ok: false, error: 'amount' };
  }

  const description = ascii(input.description);
  const account =
    tlv('00', GUI) + tlv('01', key.normalized) + (description ? tlv('02', description) : '');
  if (account.length > MAX_TEMPLATE) return { ok: false, error: 'tooLong' };

  const payload =
    tlv('00', '01') +
    tlv('26', account) +
    tlv('52', '0000') +
    tlv('53', '986') +
    (amount ? tlv('54', amount) : '') +
    tlv('58', 'BR') +
    tlv('59', name) +
    tlv('60', city) +
    tlv('62', tlv('05', txid)) +
    '6304';
  return { ok: true, code: `${payload}${crc16(payload)}` };
}
