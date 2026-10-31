import { describe, expect, it } from 'vitest';
import { buildPix, crc16, parsePix, parseTlv, validatePixKey, type PixBuildInput } from './pix';

const MANUAL =
  '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D';

const input: PixBuildInput = {
  key: '123e4567-e12b-12d1-a456-426655440000',
  name: 'Fulano de Tal',
  city: 'BRASILIA',
  amount: '',
  txid: '',
  description: '',
};

describe('crc16', () => {
  it('matches the CRC-16/CCITT-FALSE check value', () => {
    expect(crc16('123456789')).toBe('29B1');
  });

  it('pads to four digits', () => {
    expect(crc16('')).toBe('FFFF');
  });
});

describe('parseTlv', () => {
  it('reads tags and lengths', () => {
    expect(parseTlv('0002AB0101X')).toEqual([
      { tag: '00', value: 'AB' },
      { tag: '01', value: 'X' },
    ]);
  });

  it('rejects truncated data', () => {
    expect(parseTlv('0005AB')).toBeNull();
    expect(parseTlv('xx')).toBeNull();
  });
});

describe('parsePix', () => {
  it('reads the example from the BCB manual', () => {
    const result = parsePix(MANUAL);
    expect(result).toMatchObject({
      ok: true,
      code: {
        key: '123e4567-e12b-12d1-a456-426655440000',
        name: 'Fulano de Tal',
        city: 'BRASILIA',
        country: 'BR',
        currency: '986',
        txid: '***',
        crc: '1D3D',
        crcValid: true,
      },
    });
  });

  it('flags a wrong CRC and gives the expected one', () => {
    const result = parsePix(`${MANUAL.slice(0, -4)}0000`);
    expect(result).toMatchObject({ ok: true, code: { crcValid: false, expectedCrc: '1D3D' } });
  });

  it.each([
    ['garbage', 'tlv'],
    ['0002AB', 'crcMissing'],
    ['000201630400000', 'tlv'],
  ])('rejects %s', (text, error) => {
    expect(parsePix(text)).toEqual({ ok: false, error });
  });

  it('rejects EMV codes that are not Pix', () => {
    const payload = '0002012612000877777777' + '6304';
    expect(parsePix(`${payload}${crc16(payload)}`)).toEqual({ ok: false, error: 'notPix' });
  });
});

describe('buildPix', () => {
  it('reproduces the BCB manual example', () => {
    expect(buildPix(input)).toEqual({ ok: true, code: MANUAL });
  });

  it('round trips amount, txid and description', () => {
    const built = buildPix({ ...input, amount: '10.5', txid: 'PEDIDO123', description: 'Café' });
    if (!built.ok) throw new Error(built.error);
    expect(parsePix(built.code)).toMatchObject({
      ok: true,
      code: { amount: '10.50', txid: 'PEDIDO123', description: 'Cafe', crcValid: true },
    });
  });

  it('strips accents and truncates name and city', () => {
    const built = buildPix({
      ...input,
      name: 'José da Conceição Ferreira de Almeida',
      city: 'São José do Rio Preto',
    });
    if (!built.ok) throw new Error(built.error);
    expect(parsePix(built.code)).toMatchObject({
      code: { name: 'Jose da Conceicao Ferreir', city: 'Sao Jose do Rio' },
    });
  });

  it.each([
    [{ key: 'nope' }, 'key'],
    [{ name: ' ' }, 'name'],
    [{ city: '' }, 'city'],
    [{ amount: '0' }, 'amount'],
    [{ amount: '1.234' }, 'amount'],
    [{ amount: 'abc' }, 'amount'],
    [{ amount: '12345678901.00' }, 'amount'],
    [{ txid: 'with space' }, 'txid'],
    [{ description: 'x'.repeat(60) }, 'tooLong'],
  ])('rejects %j', (overrides, error) => {
    expect(buildPix({ ...input, ...overrides })).toEqual({ ok: false, error });
  });
});

describe('validatePixKey', () => {
  it.each([
    ['529.982.247-25', 'cpf', true, '52998224725'],
    ['52998224724', 'cpf', false, '52998224724'],
    ['11.222.333/0001-81', 'cnpj', true, '11222333000181'],
    ['12ABC34501DE35', 'cnpj', true, '12ABC34501DE35'],
    ['Fulano@Example.com', 'email', true, 'fulano@example.com'],
    ['fulano@', 'email', false, 'fulano@'],
    ['+5511987654321', 'phone', true, '+5511987654321'],
    ['+56912345678', 'phone', false, '+56912345678'],
    ['123E4567-E12B-12D1-A456-426655440000', 'evp', true, '123e4567-e12b-12d1-a456-426655440000'],
    ['hello', null, false, 'hello'],
  ])('checks %s', (key, type, valid, normalized) => {
    expect(validatePixKey(key)).toEqual({ type, valid, normalized });
  });
});
