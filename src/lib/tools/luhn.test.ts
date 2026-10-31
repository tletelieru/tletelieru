import { describe, expect, it } from 'vitest';
import {
  checkLuhn,
  checkLuhnLines,
  completeLuhnLines,
  detectBrand,
  groupCard,
  isLuhnValid,
  luhnCheckDigit,
  testCards,
} from './luhn';

describe('luhn', () => {
  it('passes the Wikipedia vector', () => {
    expect(luhnCheckDigit('7992739871')).toBe('3');
    expect(isLuhnValid('79927398713')).toBe(true);
    expect(isLuhnValid('79927398714')).toBe(false);
  });

  it.each(testCards.map((card) => [card.number, card.brand] as const))(
    'documented card %s is valid and %s',
    (number, brand) => {
      expect(isLuhnValid(number)).toBe(true);
      expect(detectBrand(number)).toBe(brand);
    },
  );

  it.each([
    ['2720991234567890', 'mastercard'],
    ['2721001234567890', null],
    ['6500000000000000', 'discover'],
    ['9999', null],
  ])('detects the brand of %s', (digits, brand) => {
    expect(detectBrand(digits)).toBe(brand);
  });
});

describe('checkLuhn', () => {
  it('flags documented test cards and ignores separators', () => {
    expect(checkLuhn('4242 4242-4242 4242')).toMatchObject({
      digits: '4242424242424242',
      valid: true,
      brand: 'visa',
      testCard: true,
    });
  });

  it('suggests the right check digit', () => {
    expect(checkLuhn('4242424242424241')).toMatchObject({ valid: false, checkDigit: '2' });
  });

  it('rejects non digits', () => {
    expect(checkLuhn('abc')).toMatchObject({ digits: null, valid: false });
  });

  it('skips blank lines', () => {
    expect(checkLuhnLines('\n4242424242424242\n\n1\n')).toHaveLength(2);
  });
});

describe('completeLuhnLines', () => {
  it('appends the check digit', () => {
    expect(completeLuhnLines('424242424242424\nabc')).toEqual([
      { input: '424242424242424', output: '4242424242424242' },
      { input: 'abc', output: null },
    ]);
  });
});

describe('groupCard', () => {
  it('groups by brand layout', () => {
    expect(groupCard('4242424242424242')).toBe('4242 4242 4242 4242');
    expect(groupCard('378282246310005')).toBe('3782 822463 10005');
  });
});
