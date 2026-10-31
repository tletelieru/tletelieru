import { describe, expect, it } from 'vitest';
import {
  AUTO_COLUMN,
  detectColumns,
  NO_COLUMN,
  normalizeDate,
  normalizeStatement,
  type ColumnMapping,
  type StatementOptions,
  type StatementSuccess,
} from './bank-statement';

const auto: ColumnMapping = {
  date: AUTO_COLUMN,
  description: AUTO_COLUMN,
  debit: AUTO_COLUMN,
  credit: AUTO_COLUMN,
  balance: AUTO_COLUMN,
  amount: AUTO_COLUMN,
};

const options: StatementOptions = {
  delimiter: 'auto',
  header: true,
  mapping: auto,
  numberFormat: 'auto',
  dateOrder: 'auto',
  output: 'csv',
};

function run(input: string, overrides: Partial<StatementOptions> = {}): StatementSuccess {
  const result = normalizeStatement(input, { ...options, ...overrides });
  if (!result.ok) throw new Error(result.error.code);
  return result;
}

const CHILE = `Fecha;Descripción;Cargos;Abonos;Saldo
15/01/2026;Compra supermercado;12.345;;987.655
16/01/2026;Transferencia recibida;;100.000;1.087.655`;

describe('normalizeStatement', () => {
  it('normalizes a Chilean statement', () => {
    const result = run(CHILE);
    expect(result.output).toBe(
      [
        'date,description,debit,credit,balance',
        '2026-01-15,Compra supermercado,12345,,987655',
        '2026-01-16,Transferencia recibida,,100000,1087655',
      ].join('\n'),
    );
    expect(result).toMatchObject({ numberFormat: 'comma', dateOrder: 'dmy', invalid: [] });
  });

  it('splits a single signed amount column', () => {
    const result = run(
      'Date,Description,Amount,Balance\n01/31/2026,Coffee,-4.50,95.50\n02/01/2026,Pay,100.00,195.50',
    );
    expect(result.rows).toEqual([
      { date: '2026-01-31', description: 'Coffee', debit: '4.50', credit: '', balance: '95.50' },
      { date: '2026-02-01', description: 'Pay', debit: '', credit: '100.00', balance: '195.50' },
    ]);
    expect(result).toMatchObject({ numberFormat: 'dot', dateOrder: 'mdy' });
  });

  it('accepts ISO dates and outputs JSON', () => {
    const result = run('date,description,debit,credit\n2026-01-15,"A, B",1.50,', {
      output: 'json',
    });
    expect(JSON.parse(result.output)).toEqual([
      { date: '2026-01-15', description: 'A, B', debit: '1.50', credit: '', balance: '' },
    ]);
  });

  it('quotes CSV cells that need it', () => {
    expect(run('date,description,debit\n2026-01-15,"A, B",1.50').output).toContain('"A, B"');
  });

  it('honors manual mapping', () => {
    const mapping = { ...auto, date: '1', description: '0', debit: '2' };
    const result = run('x,y,z\nCafe,2026-01-15,5', { mapping });
    expect(result.rows[0]).toMatchObject({ date: '2026-01-15', description: 'Cafe', debit: '5' });
  });

  it('can drop a detected column', () => {
    const result = run(CHILE, { mapping: { ...auto, balance: NO_COLUMN } });
    expect(result.rows[0]?.balance).toBe('');
  });

  it('works without a header', () => {
    const mapping = { ...auto, date: '0', amount: '1' };
    expect(run('2026-01-15,5', { header: false, mapping }).rows).toHaveLength(1);
  });

  it('reports invalid cells with their row', () => {
    const { invalid, rows } = run('date,description,debit\nnope,x,abc');
    expect(invalid).toEqual([
      { row: 2, field: 'date', text: 'nope' },
      { row: 2, field: 'debit', text: 'abc' },
    ]);
    expect(rows[0]?.date).toBe('nope');
  });

  it('reports missing columns and CSV errors', () => {
    expect(normalizeStatement('a,b\n1,2', options)).toEqual({
      ok: false,
      error: { code: 'noDate' },
    });
    expect(normalizeStatement('date,x\n2026-01-01,2', options)).toEqual({
      ok: false,
      error: { code: 'noAmount' },
    });
    expect(normalizeStatement('date,debit\n"open', options)).toMatchObject({
      ok: false,
      error: { code: 'csv' },
    });
  });
});

describe('detectColumns', () => {
  it('reads Spanish and English names, with accents', () => {
    expect(detectColumns(['Fecha', 'Glosa', 'Débito', 'Crédito', 'Saldo'])).toEqual({
      date: 0,
      description: 1,
      debit: 2,
      credit: 3,
      balance: 4,
      amount: null,
    });
    expect(detectColumns(['Posting Date', 'Details', 'Amount']).amount).toBe(2);
  });
});

describe('normalizeDate', () => {
  it.each([
    ['15/01/2026', 'dmy', '2026-01-15'],
    ['15-01-26', 'dmy', '2026-01-15'],
    ['15.1.2026', 'dmy', '2026-01-15'],
    ['01/15/2026', 'mdy', '2026-01-15'],
    ['2026-01-15 10:30', 'ymd', '2026-01-15'],
  ] as const)('reads %s', (text, order, expected) => {
    expect(normalizeDate(text, order)).toBe(expected);
  });

  it.each(['31/02/2026', '2026', 'abc'])('rejects %s', (text) => {
    expect(normalizeDate(text, 'dmy')).toBeNull();
  });
});
