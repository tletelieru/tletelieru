import {
  fromBase64,
  fromHex,
  hmac,
  toBase64,
  toHex,
  utf8,
  type Bytes,
  type HashAlgorithm,
} from './hash';

export const webhookProviders = ['stripe', 'github', 'svix', 'generic'] as const;
export type WebhookProvider = (typeof webhookProviders)[number];

export const webhookAlgorithms = ['sha256', 'sha1', 'sha512'] as const;
export type WebhookAlgorithm = (typeof webhookAlgorithms)[number];

export interface WebhookInput {
  provider: WebhookProvider;
  secret: string;
  payload: string;
  signature: string;
  messageId: string;
  timestamp: string;
  algorithm: WebhookAlgorithm;
}

export type WebhookError = 'header' | 'secret';

export interface WebhookCheck {
  match: boolean;
  expected: string;
  signedPayload: string;
  timestamp: number | null;
}

export type WebhookResult = { ok: true; check: WebhookCheck } | { ok: false; error: WebhookError };

export type ToleranceStatus = 'within' | 'outside';

interface SignatureRequest {
  key: Bytes;
  signed: string;
  algorithm: HashAlgorithm;
  encoding: 'hex' | 'base64' | 'any';
  candidates: string[];
  timestamp: number | null;
}

function parseStripeHeader(header: string): { timestamp: string; candidates: string[] } | null {
  const parts = header
    .split(',')
    .map((part) => part.trim().split('='))
    .filter((part) => part.length === 2);
  const timestamp = parts.find(([name]) => name === 't')?.[1];
  const candidates = parts.flatMap(([name, value]) => (name === 'v1' && value ? [value] : []));
  if (!timestamp || !/^\d+$/.test(timestamp) || candidates.length === 0) return null;
  return { timestamp, candidates };
}

function stripeRequest(input: WebhookInput): SignatureRequest | WebhookError {
  const parsed = parseStripeHeader(input.signature);
  if (!parsed) return 'header';
  return {
    key: utf8(input.secret),
    signed: `${parsed.timestamp}.${input.payload}`,
    algorithm: 'sha256',
    encoding: 'hex',
    candidates: parsed.candidates,
    timestamp: Number(parsed.timestamp),
  };
}

function githubRequest(input: WebhookInput): SignatureRequest | WebhookError {
  const match = /^sha256=([0-9a-fA-F]+)$/.exec(input.signature.trim());
  if (!match?.[1]) return 'header';
  return {
    key: utf8(input.secret),
    signed: input.payload,
    algorithm: 'sha256',
    encoding: 'hex',
    candidates: [match[1]],
    timestamp: null,
  };
}

function svixRequest(input: WebhookInput): SignatureRequest | WebhookError {
  const key = fromBase64(input.secret.trim().replace(/^whsec_/, ''));
  if (!key || key.length === 0) return 'secret';
  const candidates = input.signature
    .trim()
    .split(/\s+/)
    .flatMap((entry) => {
      const [version, value] = entry.split(',');
      return version === 'v1' && value ? [value] : [];
    });
  const timestamp = input.timestamp.trim();
  if (candidates.length === 0 || !/^\d+$/.test(timestamp) || input.messageId.trim() === '') {
    return 'header';
  }
  return {
    key,
    signed: `${input.messageId.trim()}.${timestamp}.${input.payload}`,
    algorithm: 'sha256',
    encoding: 'base64',
    candidates,
    timestamp: Number(timestamp),
  };
}

function genericRequest(input: WebhookInput): SignatureRequest | WebhookError {
  const clean = input.signature.trim().replace(/^(?:sha1|sha256|sha512)=/i, '');
  if (clean === '') return 'header';
  return {
    key: utf8(input.secret),
    signed: input.payload,
    algorithm: input.algorithm,
    encoding: 'any',
    candidates: [clean],
    timestamp: null,
  };
}

const builders: Record<WebhookProvider, (input: WebhookInput) => SignatureRequest | WebhookError> =
  {
    stripe: stripeRequest,
    github: githubRequest,
    svix: svixRequest,
    generic: genericRequest,
  };

function sameBytes(a: Uint8Array, b: Uint8Array | null): boolean {
  return b !== null && a.length === b.length && a.every((byte, index) => byte === b[index]);
}

function matches(mac: Bytes, candidate: string, encoding: SignatureRequest['encoding']): boolean {
  if (encoding !== 'base64' && sameBytes(mac, fromHex(candidate))) return true;
  return encoding !== 'hex' && sameBytes(mac, fromBase64(candidate));
}

export async function verifyWebhook(input: WebhookInput): Promise<WebhookResult> {
  const request = builders[input.provider](input);
  if (typeof request === 'string') return { ok: false, error: request };
  const mac = await hmac(request.algorithm, request.key, utf8(request.signed));
  return {
    ok: true,
    check: {
      match: request.candidates.some((candidate) => matches(mac, candidate, request.encoding)),
      expected: request.encoding === 'base64' ? toBase64(mac) : toHex(mac),
      signedPayload: request.signed,
      timestamp: request.timestamp,
    },
  };
}

export function toleranceStatus(
  timestamp: number,
  nowMs: number,
  toleranceSeconds: number,
): ToleranceStatus {
  return Math.abs(nowMs / 1000 - timestamp) <= toleranceSeconds ? 'within' : 'outside';
}
