import { describe, expect, it } from 'vitest';
import { buildBlnkPayload, type BlnkFields } from './blnk-payload';

const fields: BlnkFields = {
  amount: '750.25',
  precision: '100',
  reference: 'ref_001',
  currency: 'usd',
  source: '@WorldUSD',
  destination: 'bln_0be360ca',
  description: 'Deposit',
  allowOverdraft: true,
  inflight: false,
  skipQueue: false,
  metaData: '{"order":"A-1"}',
};

describe('buildBlnkPayload', () => {
  it('builds the payload in Blnk field names', () => {
    const result = buildBlnkPayload(fields);
    if (!result.ok) throw new Error('expected ok');
    expect(JSON.parse(result.output)).toEqual({
      amount: 750.25,
      precision: 100,
      reference: 'ref_001',
      currency: 'USD',
      source: '@WorldUSD',
      destination: 'bln_0be360ca',
      description: 'Deposit',
      allow_overdraft: true,
      inflight: false,
      skip_queue: false,
      meta_data: { order: 'A-1' },
    });
    expect(result.preciseAmount).toBe('75025');
    expect(result.lossy).toBe(false);
  });

  it('writes the amount as typed, without float noise', () => {
    const result = buildBlnkPayload({ ...fields, amount: '1234567890123456.78' });
    expect(result).toMatchObject({ preciseAmount: '123456789012345678' });
    expect(result.ok && result.output).toContain('"amount": 1234567890123456.78,');
  });

  it('omits empty description and meta_data', () => {
    const result = buildBlnkPayload({ ...fields, description: '', metaData: '' });
    expect(result.ok && result.output).not.toContain('description');
    expect(result.ok && result.output).not.toContain('meta_data');
  });

  it('flags an amount that does not fit the precision', () => {
    expect(buildBlnkPayload({ ...fields, amount: '1.005' })).toMatchObject({
      preciseAmount: '100.5',
      lossy: true,
    });
  });

  it('reports every problem at once', () => {
    expect(
      buildBlnkPayload({
        ...fields,
        amount: '0',
        precision: '1.5',
        reference: ' ',
        currency: '',
        source: '',
        destination: '',
        metaData: '[1]',
      }),
    ).toEqual({
      ok: false,
      errors: ['amount', 'precision', 'reference', 'currency', 'source', 'destination', 'metaData'],
    });
  });

  it('rejects malformed meta_data', () => {
    expect(buildBlnkPayload({ ...fields, metaData: '{' })).toEqual({
      ok: false,
      errors: ['metaData'],
    });
  });
});
