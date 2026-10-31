import { describe, expect, it } from 'vitest';
import { toleranceStatus, verifyWebhook, type WebhookInput } from './webhook-verify';

const payload = '{"id":"evt_1","type":"payment.succeeded"}';

const base: WebhookInput = {
  provider: 'github',
  secret: 'my_secret',
  payload,
  signature: '',
  messageId: '',
  timestamp: '',
  algorithm: 'sha256',
};

const HEX = '5320fab54f300e24656cb47617cd6d91c8d8a447c45d1eb941c2e0851f1536b7';

describe('verifyWebhook', () => {
  it('verifies the Stripe scheme', async () => {
    const result = await verifyWebhook({
      ...base,
      provider: 'stripe',
      secret: 'whsec_test_secret',
      signature:
        't=1700000000,v0=abc,v1=0a731970e30844c135c2ba545c0b030783248e5151afff97d4b4cac22ffa7321',
    });
    expect(result).toMatchObject({
      ok: true,
      check: { match: true, timestamp: 1700000000, signedPayload: `1700000000.${payload}` },
    });
  });

  it('accepts any v1 during Stripe secret rotation', async () => {
    const result = await verifyWebhook({
      ...base,
      provider: 'stripe',
      secret: 'whsec_test_secret',
      signature:
        't=1700000000,v1=00,v1=0a731970e30844c135c2ba545c0b030783248e5151afff97d4b4cac22ffa7321',
    });
    expect(result).toMatchObject({ check: { match: true } });
  });

  it('verifies the GitHub scheme and gives the expected value on failure', async () => {
    expect(await verifyWebhook({ ...base, signature: `sha256=${HEX}` })).toMatchObject({
      check: { match: true, expected: HEX, timestamp: null },
    });
    expect(
      await verifyWebhook({ ...base, secret: 'other', signature: `sha256=${HEX}` }),
    ).toMatchObject({
      check: { match: false },
    });
  });

  it('verifies the Svix scheme with a base64 secret', async () => {
    const result = await verifyWebhook({
      ...base,
      provider: 'svix',
      secret: 'whsec_c3ZpeF90ZXN0X3NlY3JldF9rZXk=',
      signature: 'v1,bad v1,X0vUmjeZJcdUB2M1VK8tsdGmUubLTS++AiaiEyqDGUQ=',
      messageId: 'msg_1',
      timestamp: '1700000000',
    });
    expect(result).toMatchObject({ check: { match: true, timestamp: 1700000000 } });
  });

  it('verifies generic hex, prefixed hex and base64', async () => {
    const base64 = Buffer.from(HEX, 'hex').toString('base64');
    for (const signature of [HEX, HEX.toUpperCase(), `sha256=${HEX}`, base64]) {
      expect(await verifyWebhook({ ...base, provider: 'generic', signature })).toMatchObject({
        check: { match: true },
      });
    }
  });

  it('supports other generic algorithms', async () => {
    const result = await verifyWebhook({
      ...base,
      provider: 'generic',
      algorithm: 'sha1',
      secret: 'key',
      payload: 'The quick brown fox jumps over the lazy dog',
      signature: 'de7c9b85b8b78aa6bc8a7a36f70a90701c9db4d9',
    });
    expect(result).toMatchObject({ check: { match: true } });
  });

  it.each([
    [{ provider: 'stripe', signature: 'nope' }, 'header'],
    [{ provider: 'stripe', signature: 't=abc,v1=00' }, 'header'],
    [{ provider: 'github', signature: 'sha1=abc' }, 'header'],
    [{ provider: 'generic', signature: ' ' }, 'header'],
    [{ provider: 'svix', secret: '***', signature: 'v1,a' }, 'secret'],
    [{ provider: 'svix', secret: 'YWJj', signature: 'v1,a', timestamp: 'x' }, 'header'],
  ] as const)('rejects %j', async (overrides, error) => {
    expect(await verifyWebhook({ ...base, ...overrides })).toEqual({ ok: false, error });
  });
});

describe('toleranceStatus', () => {
  it('compares the age against the tolerance in both directions', () => {
    expect(toleranceStatus(1000, 1_100_000, 300)).toBe('within');
    expect(toleranceStatus(1000, 1_301_000, 300)).toBe('outside');
    expect(toleranceStatus(2000, 1_000_000, 300)).toBe('outside');
  });
});
