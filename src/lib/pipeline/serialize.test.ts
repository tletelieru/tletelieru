import { describe, expect, it } from 'vitest';
import { getOperation } from './operations';
import { resolveOptions } from './options';
import { decodeSteps, encodeSteps, MAX_STEPS } from './serialize';
import type { PipelineStep } from './types';

function step(op: string, options: Record<string, string> = {}): PipelineStep {
  const operation = getOperation(op);
  if (!operation) throw new Error(`missing ${op}`);
  return { op, options: resolveOptions(operation.options, options) };
}

describe('encodeSteps', () => {
  it('writes compact ids and only non-default options', () => {
    expect(
      encodeSteps([
        step('trim-lines'),
        step('dedupe'),
        step('case', { to: 'snake' }),
        step('case', { to: 'kebab' }),
        step('sql-in-text', { quote: 'double', column: 'user_id' }),
      ]),
    ).toBe('trim-lines|dedupe|case|case:to=kebab|sql-in-text:quote=double,column=user_id');
  });

  it('percent-encodes reserved characters in text values', () => {
    const encoded = encodeSteps([step('replace', { find: 'a|b:c=d,e%f', with: 'x y\n' })]);
    expect(encoded).toBe('replace:find=a%7Cb%3Ac%3Dd%2Ce%25f,with=x%20y%0A');
    expect(encoded.split('|')).toHaveLength(1);
  });

  it('drops unknown operations', () => {
    expect(encodeSteps([{ op: 'nope', options: {} }, step('upper')])).toBe('upper');
  });
});

describe('decodeSteps', () => {
  it('round-trips steps', () => {
    const steps = [
      step('affix', { prefix: "'|", suffix: "', " }),
      step('join', { sep: '\\n|,' }),
      step('sql-like', { column: 'a.b', match: 'ends', not: 'yes' }),
      step('json-sort-keys', { indent: 'tab' }),
      step('replace', { find: '100%', with: '' }),
    ];
    expect(decodeSteps(encodeSteps(steps))).toEqual(steps);
  });

  it('fills defaults for missing options', () => {
    expect(decodeSteps('case')).toEqual([step('case', { to: 'snake' })]);
  });

  it('is robust to garbage', () => {
    expect(decodeSteps('')).toEqual([]);
    expect(decodeSteps('   ')).toEqual([]);
    expect(decodeSteps('|||')).toEqual([]);
    expect(decodeSteps('nope|upper|::|=|constructor|__proto__')).toEqual([step('upper')]);
    expect(decodeSteps('case:to=weird,bogus=1,=x,noequals')).toEqual([step('case')]);
    expect(decodeSteps('replace:find=%E0%A4%A,with=ok')).toEqual([step('replace', { with: 'ok' })]);
    expect(decodeSteps('case:to=kebab,to=camel')).toEqual([step('case', { to: 'kebab' })]);
    expect(decodeSteps('upper:')).toEqual([step('upper')]);
  });

  it('caps the number of steps', () => {
    expect(decodeSteps(Array.from({ length: 80 }, () => 'upper').join('|'))).toHaveLength(
      MAX_STEPS,
    );
  });
});
