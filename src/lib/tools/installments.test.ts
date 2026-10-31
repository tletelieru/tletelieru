import { describe, expect, it } from 'vitest';
import { parseDecimal, type Decimal } from './_shared/decimal';
import {
  simulateInstallments,
  solveMonthlyIrr,
  type InstallmentOptions,
  type InstallmentResult,
} from './installments';

const options: InstallmentOptions = {
  principal: '1000000',
  periods: 12,
  rate: '1',
  rateKind: 'monthly',
  fee: '',
  decimals: 0,
};

function run(overrides: Partial<InstallmentOptions> = {}): InstallmentResult {
  const result = simulateInstallments({ ...options, ...overrides });
  if ('error' in result) throw new Error(result.error);
  return result;
}

function d(text: string): Decimal {
  const value = parseDecimal(text);
  if (!value) throw new Error(text);
  return value;
}

describe('simulateInstallments', () => {
  it('computes the French payment', () => {
    expect(run().payment).toBe('88849');
  });

  it('closes the balance exactly and adjusts the last payment', () => {
    const { rows } = run();
    expect(rows).toHaveLength(12);
    expect(rows[0]).toEqual({
      period: 1,
      payment: '88849',
      interest: '10000',
      amortization: '78849',
      balance: '921151',
    });
    expect(rows[11]?.balance).toBe('0');
    expect(rows[11]?.payment).not.toBe('88849');
  });

  it('adds up', () => {
    const result = run();
    expect(BigInt(result.totalPaid) - BigInt(result.totalInterest)).toBe(1000000n);
  });

  it('handles a zero rate', () => {
    const result = run({ rate: '0', principal: '1000', periods: 3 });
    expect(result.rows.map((row) => row.payment)).toEqual(['333', '333', '334']);
    expect(result.totalInterest).toBe('0');
  });

  it('converts an annual nominal rate', () => {
    expect(run({ rate: '12', rateKind: 'annual' })).toMatchObject({
      monthlyRate: '1.0000',
      payment: '88849',
    });
  });

  it('keeps cents when asked', () => {
    expect(run({ principal: '1000', decimals: 2 }).payment).toBe('88.85');
  });

  it('gets a CAE close to the rate without fees', () => {
    const result = run();
    expect(Number(result.irrMonthly)).toBeCloseTo(1, 2);
    expect(Number(result.caeNominal)).toBeCloseTo(12, 1);
    expect(Number(result.caeEffective)).toBeCloseTo(12.68, 1);
  });

  it('raises the CAE with an upfront fee', () => {
    const result = run({ fee: '20000' });
    expect(result.received).toBe('980000');
    expect(Number(result.caeNominal)).toBeGreaterThan(15);
  });

  it('supports a single period', () => {
    expect(run({ periods: 1 }).rows).toEqual([
      { period: 1, payment: '1010000', interest: '10000', amortization: '1000000', balance: '0' },
    ]);
  });

  it.each([
    [{ principal: 'x' }, 'principal'],
    [{ principal: '0' }, 'principal'],
    [{ periods: 0 }, 'periods'],
    [{ periods: 601 }, 'periods'],
    [{ periods: 1.5 }, 'periods'],
    [{ rate: '' }, 'rate'],
    [{ rate: '-1' }, 'rate'],
    [{ fee: 'x' }, 'fee'],
    [{ fee: '1000000' }, 'fee'],
  ])('rejects %j', (overrides, error) => {
    expect(simulateInstallments({ ...options, ...overrides })).toEqual({ error });
  });
});

describe('solveMonthlyIrr', () => {
  it('solves a known cash flow', () => {
    const irr = solveMonthlyIrr(d('100'), [d('110')]);
    expect(irr && Number(irr.units) / 1e18).toBeCloseTo(0.1, 9);
  });

  it('returns null when payments do not cover the amount', () => {
    expect(solveMonthlyIrr(d('100'), [d('90')])).toBeNull();
  });
});
