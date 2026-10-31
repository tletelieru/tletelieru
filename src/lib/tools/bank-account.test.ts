import { describe, expect, it } from 'vitest';
import {
  clabeCheckDigit,
  detectAccountKind,
  ibanCheckDigits,
  validateAccount,
  validateAccounts,
  validateCbu,
  validateClabe,
  validateIban,
} from './bank-account';

describe('validateIban', () => {
  it.each([
    'GB82 WEST 1234 5698 7654 32',
    'DE89 3704 0044 0532 0130 00',
    'FR14 2004 1010 0505 0001 3M02 606',
    'NL91 ABNA 0417 1643 00',
    'ES91 2100 0418 4502 0005 1332',
    'BE68 5390 0754 7034',
    'NO93 8601 1117 947',
    'MT84 MALT 0110 0001 2345 MTLC AST0 01S',
  ])('accepts %s', (iban) => {
    const result = validateIban(iban);
    expect(result.valid).toBe(true);
    expect(result.formatted).toBe(iban);
  });

  it('reports a bad checksum with the expected digits', () => {
    expect(validateIban('GB83WEST12345698765432')).toMatchObject({
      valid: false,
      error: 'checksum',
      expected: '82',
    });
  });

  it('reports wrong length, unknown country and bad format', () => {
    expect(validateIban('DE8937040044053201300')).toMatchObject({
      error: 'length',
      expected: '22',
    });
    expect(validateIban('ZZ8937040044053201300')).toMatchObject({ error: 'country' });
    expect(validateIban('DEXX')).toMatchObject({ error: 'format' });
  });

  it('computes check digits', () => {
    expect(ibanCheckDigits('DE00370400440532013000')).toBe('89');
  });
});

describe('validateClabe', () => {
  it('accepts the published sample and names the bank', () => {
    const result = validateClabe('002010077777777771');
    expect(result.valid).toBe(true);
    expect(result.details).toContainEqual({ key: 'bankName', value: 'Banamex' });
    expect(result.details).toContainEqual({ key: 'plaza', value: '010' });
    expect(result.formatted).toBe('002 010 07777777777 1');
  });

  it('computes the check digit', () => {
    expect(clabeCheckDigit('00201007777777777')).toBe('1');
  });

  it('rejects a wrong digit and bad length', () => {
    expect(validateClabe('002010077777777772')).toMatchObject({ error: 'checksum', expected: '1' });
    expect(validateClabe('0020100')).toMatchObject({ error: 'format' });
  });
});

describe('validateCbu', () => {
  it('accepts a CBU and names the bank', () => {
    const result = validateCbu('2850590940090418135201');
    expect(result).toMatchObject({ kind: 'cbu', valid: true });
    expect(result.details).toContainEqual({ key: 'bankName', value: 'Banco Macro' });
  });

  it('detects CVU by the 000 prefix', () => {
    expect(validateCbu('0000003100000000000017')).toMatchObject({ kind: 'cvu', valid: true });
  });

  it('rejects a broken block', () => {
    expect(validateCbu('2850590940090418135202')).toMatchObject({
      valid: false,
      error: 'checksum',
      expected: '91',
    });
    expect(validateCbu('123')).toMatchObject({ error: 'format' });
  });
});

describe('detect and batch', () => {
  it.each([
    ['DE89370400440532013000', 'iban'],
    ['002010077777777771', 'clabe'],
    ['2850590940090418135201', 'cbu'],
    ['123', null],
  ])('detects %s', (input, kind) => {
    expect(detectAccountKind(input)).toBe(kind);
  });

  it('reports unknown shapes', () => {
    expect(validateAccount('123')).toMatchObject({ kind: null, error: 'unknown' });
  });

  it('handles one account per line', () => {
    expect(validateAccounts('DE89370400440532013000\n\n002010077777777771', 'auto')).toHaveLength(
      2,
    );
  });
});
