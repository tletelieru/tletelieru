import { describe, expect, it } from 'vitest';
import {
  validateAba,
  validateBankCode,
  validateBankCodes,
  validateBic,
  validateSortCode,
} from './bank-codes';

describe('validateBic', () => {
  it.each(['DEUTDEFF', 'DEUTDEFF500', 'BCHICLRM', 'CHASUS33XXX', 'BSCHESMM'])(
    'accepts %s',
    (bic) => {
      expect(validateBic(bic).valid).toBe(true);
    },
  );

  it('splits the parts', () => {
    expect(validateBic('deutdeff500').details).toEqual([
      { key: 'institution', value: 'DEUT' },
      { key: 'country', value: 'DE' },
      { key: 'location', value: 'FF' },
      { key: 'branch', value: '500' },
    ]);
  });

  it('flags test, passive and primary office codes', () => {
    const keys = (bic: string) => validateBic(bic).details.map((detail) => detail.key);
    expect(keys('DEUTDEF0')).toContain('testCode');
    expect(keys('DEUTDEF1')).toContain('passive');
    expect(keys('DEUTDEFFXXX')).toContain('primaryOffice');
    expect(keys('DEUTDEFF')).toContain('primaryOffice');
  });

  it('rejects bad shapes and unknown countries', () => {
    expect(validateBic('DEUTDE')).toMatchObject({ error: 'format' });
    expect(validateBic('DEUTDEFF5')).toMatchObject({ error: 'format' });
    expect(validateBic('DEUTZZFF')).toMatchObject({ error: 'country', valid: false });
  });
});

describe('validateAba', () => {
  it.each(['021000021', '011000015', '111000025', '122105155'])('accepts %s', (aba) => {
    expect(validateAba(aba).valid).toBe(true);
  });

  it('rejects a bad checksum and bad prefix', () => {
    expect(validateAba('021000022')).toMatchObject({ error: 'checksum' });
    expect(validateAba('991000021')).toMatchObject({ error: 'format' });
    expect(validateAba('12345')).toMatchObject({ error: 'format' });
  });
});

describe('validateSortCode', () => {
  it.each([
    ['12-34-56', '12-34-56'],
    ['123456', '12-34-56'],
    ['12 34 56', '12-34-56'],
  ])('formats %s', (input, formatted) => {
    expect(validateSortCode(input)).toMatchObject({ valid: true, formatted });
  });

  it('rejects other shapes', () => {
    expect(validateSortCode('12-34-5')).toMatchObject({ error: 'format' });
  });
});

describe('validateBankCode', () => {
  it.each([
    ['DEUTDEFF', 'bic'],
    ['021000021', 'aba'],
    ['12-34-56', 'sort'],
    ['123', null],
    ['!!!', null],
  ])('detects %s', (input, kind) => {
    expect(validateBankCode(input).kind).toBe(kind);
  });

  it('handles several lines', () => {
    expect(validateBankCodes('DEUTDEFF\n\n021000021')).toHaveLength(2);
  });
});
