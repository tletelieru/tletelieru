export const otpAlgorithms = ['SHA1', 'SHA256', 'SHA512'] as const;
export type OtpAlgorithm = (typeof otpAlgorithms)[number];

export const otpTypes = ['totp', 'hotp'] as const;
export type OtpType = (typeof otpTypes)[number];

export const otpDigits = [6, 7, 8] as const;

export interface OtpConfig {
  type: OtpType;
  algorithm: OtpAlgorithm;
  digits: number;
  period: number;
  counter: number;
}

export interface OtpAccount {
  secret: string;
  label: string;
  issuer: string;
  config: Partial<OtpConfig>;
}

export type OtpInputError = 'empty' | 'badBase32' | 'badUri' | 'missingSecret';

export type OtpInput =
  | { ok: true; key: Uint8Array<ArrayBuffer>; account: OtpAccount }
  | { ok: false; error: OtpInputError };

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const SUBTLE: Record<OtpAlgorithm, string> = {
  SHA1: 'SHA-1',
  SHA256: 'SHA-256',
  SHA512: 'SHA-512',
};

export function base32Decode(text: string): Uint8Array<ArrayBuffer> | null {
  const clean = text.replace(/[\s-]/g, '').replace(/=+$/, '').toUpperCase();
  if (clean === '') return null;
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    const value = BASE32.indexOf(char);
    if (value === -1) return null;
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

export function isOtpAlgorithm(value: string): value is OtpAlgorithm {
  return (otpAlgorithms as readonly string[]).includes(value);
}

function positiveInt(value: string | null): number | undefined {
  if (value === null || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : undefined;
}

export function parseOtpauth(uri: string): OtpAccount | OtpInputError {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return 'badUri';
  }
  const type = url.hostname.toLowerCase();
  if (url.protocol !== 'otpauth:' || (type !== 'totp' && type !== 'hotp')) return 'badUri';
  const secret = url.searchParams.get('secret');
  if (!secret) return 'missingSecret';
  const path = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  const [prefix, name] = path.includes(':') ? path.split(/:(.*)/s, 2) : ['', path];
  const algorithm = (url.searchParams.get('algorithm') ?? '').toUpperCase().replace('-', '');
  const digits = positiveInt(url.searchParams.get('digits'));
  const period = positiveInt(url.searchParams.get('period'));
  const counter = positiveInt(url.searchParams.get('counter'));
  const config: Partial<OtpConfig> = { type };
  if (isOtpAlgorithm(algorithm)) config.algorithm = algorithm;
  if (digits !== undefined && digits >= 6 && digits <= 10) config.digits = digits;
  if (period !== undefined && period > 0) config.period = period;
  if (counter !== undefined) config.counter = counter;
  return {
    secret,
    label: (name ?? '').trim(),
    issuer: (url.searchParams.get('issuer') ?? prefix ?? '').trim(),
    config,
  };
}

export function readOtpInput(input: string): OtpInput {
  const text = input.trim();
  if (text === '') return { ok: false, error: 'empty' };
  const account: OtpAccount | OtpInputError = /^otpauth:/i.test(text)
    ? parseOtpauth(text)
    : { secret: text, label: '', issuer: '', config: {} };
  if (typeof account === 'string') return { ok: false, error: account };
  const key = base32Decode(account.secret);
  if (!key) return { ok: false, error: 'badBase32' };
  return { ok: true, key, account };
}

export function totpCounter(epochMs: number, period: number): number {
  return Math.floor(epochMs / 1000 / period);
}

export function secondsRemaining(epochMs: number, period: number): number {
  return period - (Math.floor(epochMs / 1000) % period);
}

function counterBytes(counter: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(8);
  let value = BigInt(counter);
  for (let index = 7; index >= 0; index--) {
    bytes[index] = Number(value & 0xffn);
    value >>= 8n;
  }
  return bytes;
}

export function truncate(mac: Uint8Array, digits: number): string {
  const offset = (mac[mac.length - 1] ?? 0) & 0x0f;
  const binary =
    (((mac[offset] ?? 0) & 0x7f) << 24) |
    ((mac[offset + 1] ?? 0) << 16) |
    ((mac[offset + 2] ?? 0) << 8) |
    (mac[offset + 3] ?? 0);
  return String(binary % 10 ** digits).padStart(digits, '0');
}

export async function hotp(
  key: Uint8Array<ArrayBuffer>,
  counter: number,
  algorithm: OtpAlgorithm,
  digits: number,
): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: SUBTLE[algorithm] },
    false,
    ['sign'],
  );
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, counterBytes(counter)));
  return truncate(mac, digits);
}

export function groupCode(code: string): string {
  if (code.length < 6) return code;
  const half = Math.ceil(code.length / 2);
  return `${code.slice(0, half)} ${code.slice(half)}`;
}
