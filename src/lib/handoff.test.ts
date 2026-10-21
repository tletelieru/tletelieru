import { describe, expect, it } from 'vitest';
import {
  HANDOFF_KEY,
  buildToolLink,
  storeHandoff,
  takeHandoff,
  withoutHandoffParam,
} from './handoff';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    data,
  };
}

describe('buildToolLink', () => {
  it('keeps small inputs in the URL', () => {
    expect(buildToolLink('/t/rut/', { input: '12.345.678-5', mode: 'validate' })).toEqual({
      href: '/t/rut/?input=12.345.678-5&mode=validate',
      handoff: null,
    });
    expect(buildToolLink('/t/rut/', {})).toEqual({ href: '/t/rut/', handoff: null });
  });

  it('hands large inputs off through storage', () => {
    const params = { input: 'x'.repeat(50) };
    expect(buildToolLink('/t/json/', params, 10)).toEqual({
      href: '/t/json/?handoff=1',
      handoff: params,
    });
  });
});

describe('takeHandoff', () => {
  it('returns the stored params once and only when the URL asks for it', () => {
    const storage = memoryStorage();
    storeHandoff({ input: '{"a":1}', mode: 'format' }, storage);
    expect(takeHandoff('?other=1', storage)).toBeNull();
    expect(takeHandoff('?handoff=1', storage)).toEqual({ input: '{"a":1}', mode: 'format' });
    expect(storage.data.has(HANDOFF_KEY)).toBe(false);
    expect(takeHandoff('?handoff=1', storage)).toBeNull();
  });

  it('ignores corrupt or non-string data', () => {
    const storage = memoryStorage();
    storage.setItem(HANDOFF_KEY, '{nope');
    expect(takeHandoff('?handoff=1', storage)).toBeNull();
    storage.setItem(HANDOFF_KEY, JSON.stringify({ input: 'a', count: 3 }));
    expect(takeHandoff('?handoff=1', storage)).toEqual({ input: 'a' });
    expect(takeHandoff('?handoff=1', null)).toBeNull();
  });
});

describe('withoutHandoffParam', () => {
  it('drops only the handoff flag', () => {
    expect(withoutHandoffParam('?handoff=1&mode=format')).toBe('?mode=format');
    expect(withoutHandoffParam('?handoff=1')).toBe('');
  });
});
