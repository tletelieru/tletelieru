import { describe, expect, it } from 'vitest';
import { csvToTable, formatTable, trimNumber } from './csv-table';

const CSV =
  '"id","currency","spot","created_at"\n32188,USDCLP,927.5000,"2026-07-14 20:22:02"\n31847,BOBCLP,90.6768,"2026-06-12 16:06:32"';

function output(input: string, options: Parameters<typeof csvToTable>[1] = {}): string {
  const result = csvToTable(input, options);
  if (!result.ok) throw new Error(result.error.code);
  return result.output;
}

describe('csvToTable', () => {
  it('draws a box table inside a code block with numbers aligned right', () => {
    expect(output(CSV)).toBe(
      [
        '```',
        '┌───────┬──────────┬──────────┬─────────────────────┐',
        '│ id    │ currency │ spot     │ created_at          │',
        '├───────┼──────────┼──────────┼─────────────────────┤',
        '│ 32188 │ USDCLP   │ 927.5000 │ 2026-07-14 20:22:02 │',
        '│ 31847 │ BOBCLP   │  90.6768 │ 2026-06-12 16:06:32 │',
        '└───────┴──────────┴──────────┴─────────────────────┘',
        '```',
      ].join('\n'),
    );
  });

  it('draws ASCII without the fence and without number alignment', () => {
    expect(output('a,b\n1,22', { style: 'ascii', fence: false, alignNumbers: false })).toBe(
      ['+---+----+', '| a | b  |', '+---+----+', '| 1 | 22 |', '+---+----+'].join('\n'),
    );
  });

  it('writes a Markdown table with alignment markers and escaped pipes', () => {
    expect(output('name,n\na|b,10\nc,2', { style: 'markdown', fence: false })).toBe(
      ['| name | n   |', '| :--- | --: |', String.raw`| a\|b |  10 |`, '| c    |   2 |'].join('\n'),
    );
  });

  it('handles missing cells, line breaks and empty rows', () => {
    expect(output('a,b\n"x\ny"\n\n1,2', { fence: false, alignNumbers: false })).toBe(
      [
        '┌─────┬───┐',
        '│ a   │ b │',
        '├─────┼───┤',
        '│ x y │   │',
        '│ 1   │ 2 │',
        '└─────┴───┘',
      ].join('\n'),
    );
  });

  it('treats the first row as data when there is no header', () => {
    expect(output('1;2', { header: false, fence: false })).toBe(
      ['┌───┬───┐', '│ 1 │ 2 │', '└───┴───┘'].join('\n'),
    );
  });

  it('reports stats, empty input and parse errors', () => {
    expect(csvToTable(CSV)).toMatchObject({ ok: true, stats: { rows: 2, columns: 4 } });
    expect(csvToTable('  ')).toEqual({ ok: true, output: '', stats: { rows: 0, columns: 0 } });
    expect(csvToTable('a\n"open')).toEqual({
      ok: false,
      error: { code: 'unterminatedQuote', line: 2 },
    });
  });

  it('writes tab-separated values with trailing zeros dropped', () => {
    const csv = [
      '"id","spot","closing_price","at"',
      '32188,927.5000,92509.000000,"2026-07-14 20:22:02"',
      '1,0.10,007,x',
    ].join('\n');
    expect(output(csv, { style: 'tsv', trimZeros: true })).toBe(
      [
        'id\tspot\tclosing_price\tat',
        '32188\t927.5\t92509\t2026-07-14 20:22:02',
        '1\t0.1\t007\tx',
      ].join('\n'),
    );
  });

  it('trims zeros only on plain decimals', () => {
    expect(trimNumber('1.500')).toBe('1.5');
    expect(trimNumber('2.000')).toBe('2');
    expect(trimNumber('100')).toBe('100');
    expect(trimNumber('1.0e5')).toBe('1.0e5');
    expect(trimNumber('v1.10')).toBe('v1.10');
  });

  it('keeps a mixed column left-aligned', () => {
    expect(formatTable(['v'], [['10'], ['abc']], { style: 'ascii', alignNumbers: true })).toContain(
      '| 10  |',
    );
  });
});
