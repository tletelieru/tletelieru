import { describe, expect, it } from 'vitest';
import { diffLists, type ListDiffOptions } from './list-diff';

const ids: ListDiffOptions = { amounts: false, format: 'auto', ignoreCase: false };
const amounts: ListDiffOptions = { ...ids, amounts: true };

describe('diffLists', () => {
  it('compares plain IDs', () => {
    const result = diffLists('a\nb\nc', 'b\nc\nd', ids);
    expect(result.onlyA).toEqual([{ id: 'a', amount: null }]);
    expect(result.onlyB).toEqual([{ id: 'd', amount: null }]);
    expect(result.both.map((entry) => entry.id)).toEqual(['b', 'c']);
    expect(result.totals).toBeNull();
  });

  it('keeps commas in IDs without amounts', () => {
    expect(diffLists('a,b', 'a,b', ids).both).toHaveLength(1);
  });

  it('finds amount mismatches exactly', () => {
    const result = diffLists('tx1,10.10\ntx2,0.3', 'tx1,10.1\ntx2,0.30000001', amounts);
    expect(result.both.map((entry) => entry.id)).toEqual(['tx1']);
    expect(result.mismatches).toEqual([
      { id: 'tx2', a: '0.3', b: '0.30000001', delta: '0.00000001' },
    ]);
  });

  it('reads es-CL amounts with semicolons', () => {
    const result = diffLists('a;1.234,50', 'a;1.234,51', amounts);
    expect(result.mismatches[0]).toMatchObject({ a: '1234.50', b: '1234.51', delta: '0.01' });
  });

  it('accepts tabs and spaces between columns', () => {
    expect(diffLists('a\t5', 'a 5', amounts).both).toHaveLength(1);
  });

  it('sums duplicates and reports them', () => {
    const result = diffLists('a,1\na,2', 'a,3', amounts);
    expect(result.both).toEqual([{ id: 'a', amount: '3' }]);
    expect(result.duplicates).toEqual({ a: ['a'], b: [] });
  });

  it('skips a header row and reports later bad rows', () => {
    const result = diffLists('id,amount\na,1\nb,xx', 'a,1', amounts);
    expect(result.invalid).toEqual([{ side: 'a', line: 3, text: 'b,xx' }]);
    expect(result.both).toHaveLength(1);
  });

  it('computes totals', () => {
    expect(diffLists('a,0.1\nb,0.2', 'a,1', amounts).totals).toEqual({ a: '0.3', b: '1' });
  });

  it('can ignore case', () => {
    expect(diffLists('ABC', 'abc', { ...ids, ignoreCase: true }).both).toHaveLength(1);
    expect(diffLists('ABC', 'abc', ids).both).toHaveLength(0);
  });

  it('handles empty lists', () => {
    expect(diffLists('', '', ids)).toMatchObject({ onlyA: [], onlyB: [], both: [] });
  });
});
