import { describe, expect, it } from 'vitest';
import { parseMt, swiftAmount, swiftDate, type MtMessage } from './swift-mt';

const MT103 = `{1:F01BANKBEBBAXXX0000000000}{2:I103BANKDEFFXXXXN}{3:{108:MUR123}}{4:
:20:REF12345
:23B:CRED
:32A:260115EUR1234,56
:33B:EUR1234,56
:50K:/BE68539007547034
JOHN DOE
RUE DE LA LOI 1
:59:/DE89370400440532013000
JANE ROE
:70:INVOICE 42
:71A:SHA
-}{5:{CHK:123456789ABC}}`;

const MT940 = `:20:STMT001
:25:12345678
:28C:1/1
:60F:C260101EUR1000,00
:61:2601020102D250,50NTRFREF1//BANK1
SUPPLIER PAYMENT
:86:Payment to supplier
second line
:61:260103C100,NMSCNONREF
:62F:C260103EUR849,50
:64:C260103EUR849,50`;

function message(input: string): MtMessage {
  const result = parseMt(input);
  if (!result.ok) throw new Error(result.error);
  return result.message;
}

function field(input: string, tag: string) {
  return message(input).fields.find((item) => item.tag === tag);
}

describe('parseMt', () => {
  it('splits MT103 blocks', () => {
    const parsed = message(MT103);
    expect(parsed).toMatchObject({ type: '103', direction: 'input' });
    expect(parsed.blocks['1']).toBe('F01BANKBEBBAXXX0000000000');
    expect(parsed.blocks['3']).toBe('{108:MUR123}');
    expect(parsed.blocks['5']).toBe('{CHK:123456789ABC}');
    expect(parsed.blocks['4']).toBeUndefined();
  });

  it('decodes value date, currency and amount', () => {
    expect(field(MT103, '32A')?.parsed).toEqual({
      date: '2026-01-15',
      currency: 'EUR',
      amount: '1234.56',
    });
  });

  it('keeps multi-line fields', () => {
    expect(field(MT103, '50K')?.value).toBe('/BE68539007547034\nJOHN DOE\nRUE DE LA LOI 1');
  });

  it('reads MT940 balances', () => {
    expect(message(MT940).type).toBe('940');
    expect(field(MT940, '60F')?.parsed).toEqual({
      mark: 'C',
      date: '2026-01-01',
      currency: 'EUR',
      amount: '1000.00',
    });
  });

  it('reads statement lines', () => {
    expect(field(MT940, '61')?.parsed).toEqual({
      valueDate: '2026-01-02',
      entryDate: '2026-01-02',
      mark: 'D',
      amount: '250.50',
      transactionType: 'NTRF',
      reference: 'REF1',
      bankReference: 'BANK1',
      details: 'SUPPLIER PAYMENT',
    });
    const lines = message(MT940).fields.filter((item) => item.tag === '61');
    expect(lines[1]?.parsed).toMatchObject({ mark: 'C', amount: '100', reference: 'NONREF' });
  });

  it('keeps information to the account owner across lines', () => {
    expect(field(MT940, '86')?.value).toBe('Payment to supplier\nsecond line');
  });

  it('detects the type without headers or from block 2', () => {
    expect(message(':20:X\n:32A:260115USD1,\n:59:Y').type).toBe('103');
    expect(message('{2:O9401200260101BANKBEBBAXXX}{4:\n:20:X\n-}').type).toBe('940');
    expect(message('{2:O9001200260101BANKBEBBAXXX}{4:\n:20:X\n-}')).toMatchObject({
      type: null,
      direction: 'output',
    });
  });

  it('leaves unparseable values raw', () => {
    expect(field(':32A:garbage', '32A')).toEqual({ tag: '32A', value: 'garbage' });
  });

  it('reports empty input and text without fields', () => {
    expect(parseMt('  ')).toEqual({ ok: false, error: 'empty' });
    expect(parseMt('hello')).toEqual({ ok: false, error: 'noFields' });
  });
});

describe('helpers', () => {
  it('normalizes SWIFT dates and amounts', () => {
    expect(swiftDate('260115')).toBe('2026-01-15');
    expect(swiftAmount('1234,56')).toBe('1234.56');
    expect(swiftAmount('1234,')).toBe('1234');
  });
});
