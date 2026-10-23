import { describe, expect, it } from 'vitest';
import {
  WORDS,
  buildPool,
  generatePasswords,
  passwordEntropy,
  randomIndex,
  strengthOf,
  type PasswordOptions,
  type RandomSource,
} from './password';

function sequence(values: number[]): RandomSource {
  let index = 0;
  return (buffer) => {
    for (let offset = 0; offset < buffer.length; offset++) {
      buffer[offset] = values[index % values.length] ?? 0;
      index++;
    }
    return buffer;
  };
}

const seeded: RandomSource = (() => {
  let state = 42;
  return (buffer: Uint32Array<ArrayBuffer>) => {
    for (let offset = 0; offset < buffer.length; offset++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      buffer[offset] = state;
    }
    return buffer;
  };
})();

const base: PasswordOptions = {
  mode: 'password',
  length: 16,
  sets: ['lower', 'upper', 'digits', 'symbols'],
  excludeAmbiguous: false,
  words: 5,
  separator: '-',
  capitalize: false,
  addNumber: false,
  count: 3,
};

describe('randomIndex', () => {
  it('rejects values that would bias the result', () => {
    expect(randomIndex(3, sequence([0xffffffff, 4]))).toBe(1);
  });
});

describe('buildPool', () => {
  it('joins sets and drops ambiguous characters', () => {
    expect(buildPool(['digits'], false)).toBe('0123456789');
    expect(buildPool(['digits'], true)).toBe('23456789');
    expect(buildPool(['lower', 'upper'], true)).not.toMatch(/[lIoO]/);
  });
});

describe('generatePasswords', () => {
  it('generates passwords with every chosen set', () => {
    const result = generatePasswords(base, seeded);
    expect(result.ok && result.values).toHaveLength(3);
    for (const value of result.ok ? result.values : []) {
      expect(value).toHaveLength(16);
      expect(value).toMatch(/[a-z]/);
      expect(value).toMatch(/[A-Z]/);
      expect(value).toMatch(/\d/);
      expect(value).toMatch(/[^A-Za-z0-9]/);
    }
  });

  it('honors exclude ambiguous', () => {
    const result = generatePasswords({ ...base, count: 20, excludeAmbiguous: true }, seeded);
    expect((result.ok ? result.values : []).join('')).not.toMatch(/[Il1O0o|`'"]/);
  });

  it('generates passphrases', () => {
    const result = generatePasswords(
      { ...base, mode: 'passphrase', words: 4, capitalize: true, addNumber: true, count: 1 },
      seeded,
    );
    const [phrase = ''] = result.ok ? result.values : [];
    const words = phrase.split('-');
    expect(words).toHaveLength(4);
    expect(words.every((word) => /^[A-Z][a-z]+\d?$/.test(word))).toBe(true);
    expect(phrase).toMatch(/\d/);
  });

  it('requires at least one character set', () => {
    expect(generatePasswords({ ...base, sets: [] }, seeded)).toEqual({
      ok: false,
      error: { code: 'noCharsets' },
    });
  });
});

describe('entropy', () => {
  it('computes bits for passwords and passphrases', () => {
    expect(passwordEntropy({ ...base, sets: ['digits'], length: 10 })).toBeCloseTo(33.22, 2);
    expect(passwordEntropy({ ...base, mode: 'passphrase', words: 6 })).toBe(48);
    expect(WORDS).toHaveLength(256);
    expect(new Set(WORDS).size).toBe(256);
  });

  it.each([
    [30, 'weak'],
    [50, 'fair'],
    [70, 'strong'],
    [100, 'veryStrong'],
  ] as const)('labels %d bits as %s', (bits, label) => {
    expect(strengthOf(bits)).toBe(label);
  });
});
