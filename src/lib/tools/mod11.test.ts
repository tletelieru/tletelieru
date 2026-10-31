import { describe, expect, it } from 'vitest';
import { computeCpfDv } from './cpf';
import { computeMod11, computeMod11Lines, mod11Presets, parseWeights } from './mod11';
import { computeRutDv } from './rut';

describe('computeMod11', () => {
  it.each([
    ['12345678', '5'],
    ['11111111', '1'],
    ['1000005', 'K'],
    ['6', 'K'],
  ])('computes the RUT digit of %s', (input, check) => {
    expect(computeMod11(input, mod11Presets.rut)?.check).toBe(check);
  });

  it('agrees with the RUT module across a range', () => {
    for (let value = 1_000_000; value < 1_000_200; value++) {
      expect(computeMod11(String(value), mod11Presets.rut)?.check).toBe(
        computeRutDv(String(value)),
      );
    }
  });

  it('shows every step', () => {
    const result = computeMod11('12', mod11Presets.rut);
    expect(result).toMatchObject({
      steps: [
        { digit: 2, weight: 2, product: 4 },
        { digit: 1, weight: 3, product: 3 },
      ],
      sum: 7,
      remainder: 7,
      value: 4,
      check: '4',
    });
  });

  it('computes the first CPF digit', () => {
    expect(computeMod11('529982247', mod11Presets.cpf)?.check).toBe(
      computeCpfDv('529982247').slice(0, 1),
    );
  });

  it('computes ISBN-10 check digits', () => {
    expect(computeMod11('030640615', mod11Presets.isbn10)?.check).toBe('2');
    expect(computeMod11('080442957', mod11Presets.isbn10)?.check).toBe('X');
  });

  it('can return the plain remainder', () => {
    expect(computeMod11('12', { ...mod11Presets.rut, result: 'remainder' })?.check).toBe('7');
  });

  it('maps remainder zero to the eleven symbol', () => {
    expect(computeMod11('0', { ...mod11Presets.rut, eleven: 'E' })?.check).toBe('E');
  });

  it('ignores separators', () => {
    expect(computeMod11('12.345.678', mod11Presets.rut)?.input).toBe('12345678');
  });

  it('rejects bad input and weights', () => {
    expect(computeMod11('abc', mod11Presets.rut)).toBeNull();
    expect(computeMod11('1', { ...mod11Presets.rut, weights: 'x' })).toBeNull();
  });
});

describe('parseWeights', () => {
  it('accepts commas, spaces and semicolons', () => {
    expect(parseWeights('2, 3;4 5')).toEqual([2, 3, 4, 5]);
    expect(parseWeights('')).toBeNull();
  });
});

describe('computeMod11Lines', () => {
  it('marks invalid lines', () => {
    expect(computeMod11Lines('12\n\nx', mod11Presets.rut)).toMatchObject([
      { check: '4' },
      { input: 'x', invalid: true },
    ]);
  });
});
