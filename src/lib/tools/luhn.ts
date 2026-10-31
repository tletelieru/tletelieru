export const luhnModes = ['validate', 'check', 'cards'] as const;
export type LuhnMode = (typeof luhnModes)[number];

export const cardBrands = [
  'visa',
  'mastercard',
  'amex',
  'discover',
  'diners',
  'jcb',
  'unionpay',
] as const;
export type CardBrand = (typeof cardBrands)[number];

export interface TestCard {
  number: string;
  brand: CardBrand;
  source: 'stripe' | 'visa';
  funding: 'credit' | 'debit' | 'prepaid';
}

export const testCards: readonly TestCard[] = [
  { number: '4242424242424242', brand: 'visa', source: 'stripe', funding: 'credit' },
  { number: '4000056655665556', brand: 'visa', source: 'stripe', funding: 'debit' },
  { number: '4111111111111111', brand: 'visa', source: 'visa', funding: 'credit' },
  { number: '5555555555554444', brand: 'mastercard', source: 'stripe', funding: 'credit' },
  { number: '2223003122003222', brand: 'mastercard', source: 'stripe', funding: 'credit' },
  { number: '5200828282828210', brand: 'mastercard', source: 'stripe', funding: 'debit' },
  { number: '5105105105105100', brand: 'mastercard', source: 'stripe', funding: 'prepaid' },
  { number: '378282246310005', brand: 'amex', source: 'stripe', funding: 'credit' },
  { number: '371449635398431', brand: 'amex', source: 'stripe', funding: 'credit' },
  { number: '6011111111111117', brand: 'discover', source: 'stripe', funding: 'credit' },
  { number: '6011000990139424', brand: 'discover', source: 'stripe', funding: 'credit' },
  { number: '3056930009020004', brand: 'diners', source: 'stripe', funding: 'credit' },
  { number: '36227206271667', brand: 'diners', source: 'stripe', funding: 'credit' },
  { number: '3566002020360505', brand: 'jcb', source: 'stripe', funding: 'credit' },
  { number: '6200000000000005', brand: 'unionpay', source: 'stripe', funding: 'credit' },
];

const BRAND_PATTERNS: [CardBrand, RegExp][] = [
  ['amex', /^3[47]/],
  ['diners', /^3(?:0[0-5]|[68])/],
  ['jcb', /^35(?:2[89]|[3-8])/],
  ['visa', /^4/],
  ['mastercard', /^(?:5[1-5]|2(?:2[2-9]|[3-6]|7[01]|720))/],
  ['discover', /^(?:6011|65|64[4-9])/],
  ['unionpay', /^62/],
];

export function digitsOnly(input: string): string | null {
  const clean = input.replace(/[\s-]/g, '');
  return /^\d+$/.test(clean) ? clean : null;
}

function luhnSum(digits: string, doubleLast: boolean): number {
  let total = 0;
  let double = doubleLast;
  for (let index = digits.length - 1; index >= 0; index--) {
    const digit = Number(digits[index]);
    if (double) total += digit > 4 ? digit * 2 - 9 : digit * 2;
    else total += digit;
    double = !double;
  }
  return total;
}

export function isLuhnValid(digits: string): boolean {
  return digits.length > 1 && luhnSum(digits, false) % 10 === 0;
}

export function luhnCheckDigit(digits: string): string {
  return String((10 - (luhnSum(digits, true) % 10)) % 10);
}

export function detectBrand(digits: string): CardBrand | null {
  for (const [brand, pattern] of BRAND_PATTERNS) {
    if (pattern.test(digits)) return brand;
  }
  return null;
}

export function groupCard(digits: string): string {
  if (/^3[47]\d{13}$/.test(digits)) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 10)} ${digits.slice(10)}`;
  }
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

export interface LuhnReport {
  input: string;
  digits: string | null;
  valid: boolean;
  brand: CardBrand | null;
  testCard: boolean;
  checkDigit: string | null;
}

export function checkLuhn(input: string): LuhnReport {
  const digits = digitsOnly(input);
  if (!digits) {
    return { input, digits, valid: false, brand: null, testCard: false, checkDigit: null };
  }
  const valid = isLuhnValid(digits);
  return {
    input,
    digits,
    valid,
    brand: detectBrand(digits),
    testCard: testCards.some((card) => card.number === digits),
    checkDigit: valid ? null : luhnCheckDigit(digits.slice(0, -1)),
  };
}

export function checkLuhnLines(input: string): LuhnReport[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(checkLuhn);
}

export function completeLuhnLines(input: string): { input: string; output: string | null }[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const digits = digitsOnly(line);
      return { input: line, output: digits && `${digits}${luhnCheckDigit(digits)}` };
    });
}
