import { describe, expect, it } from 'vitest';
import { computeIva, type IvaOptions } from './iva';

const options: IvaOptions = { mode: 'netToGross', rate: '19', decimals: 0, format: 'auto' };

describe('computeIva', () => {
  it('adds 19 % over the net amount', () => {
    expect(computeIva('10000', options)?.rows).toEqual([
      { net: '10000', iva: '1900', gross: '11900' },
    ]);
  });

  it('extracts net and IVA from a gross amount, so they add up', () => {
    expect(computeIva('11900', { ...options, mode: 'grossToNet' })?.rows).toEqual([
      { net: '10000', iva: '1900', gross: '11900' },
    ]);
    expect(computeIva('1000', { ...options, mode: 'grossToNet' })?.rows).toEqual([
      { net: '840', iva: '160', gross: '1000' },
    ]);
  });

  it('rounds half up to whole pesos', () => {
    expect(computeIva('50', options)?.rows[0]).toEqual({ net: '50', iva: '10', gross: '60' });
    expect(computeIva('150', options)?.rows[0]).toEqual({ net: '150', iva: '29', gross: '179' });
    expect(computeIva('250', options)?.rows[0]).toEqual({ net: '250', iva: '48', gross: '298' });
  });

  it('computes the total IVA on the summed base', () => {
    const result = computeIva('50\n50\n50', options);
    expect(result?.rows.map((row) => row.iva)).toEqual(['10', '10', '10']);
    expect(result?.total).toEqual({ net: '150', iva: '29', gross: '179' });
  });

  it('reads es-CL thousands by default', () => {
    expect(computeIva('1.190.000', { ...options, mode: 'grossToNet' })?.rows[0]?.net).toBe(
      '1000000',
    );
    expect(computeIva('1.000', options)).toMatchObject({
      rows: [{ net: '1000' }],
      ambiguous: true,
    });
  });

  it('accepts a configurable rate and decimals', () => {
    expect(computeIva('100', { ...options, rate: '10.5', decimals: 2 })?.rows[0]).toEqual({
      net: '100.00',
      iva: '10.50',
      gross: '110.50',
    });
    expect(computeIva('100', { ...options, rate: '10,5', decimals: 2 })?.rows[0]?.iva).toBe(
      '10.50',
    );
  });

  it('handles a zero rate', () => {
    expect(computeIva('100', { ...options, rate: '0' })?.rows[0]?.gross).toBe('100');
  });

  it('reports invalid lines and rates', () => {
    expect(computeIva('100\nabc', options)?.invalid).toEqual([{ line: 2, text: 'abc' }]);
    expect(computeIva('100', { ...options, rate: 'x' })).toBeNull();
    expect(computeIva('100', { ...options, rate: '-1' })).toBeNull();
  });

  it('returns no total for empty input', () => {
    expect(computeIva('', options)).toMatchObject({ rows: [], total: null });
  });
});
