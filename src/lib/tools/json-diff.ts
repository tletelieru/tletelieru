import { parseJsonValue, type JsonError } from './json';

export type ArrayMode = 'index' | 'set';
export const arrayModes: readonly ArrayMode[] = ['index', 'set'];

export type JsonChange =
  | { op: 'added'; path: string; value: unknown }
  | { op: 'removed'; path: string; value: unknown }
  | { op: 'changed'; path: string; before: unknown; after: unknown };

export interface JsonDiffCounts {
  added: number;
  removed: number;
  changed: number;
}

export type JsonDiffResult =
  | { ok: true; changes: JsonChange[]; counts: JsonDiffCounts }
  | { ok: false; side: 'left' | 'right'; error: JsonError };

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function childPath(path: string, key: string | number): string {
  if (typeof key === 'number') return `${path}[${key}]`;
  return IDENTIFIER.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`;
}

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (isObject(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function diffArraysAsSet(path: string, before: unknown[], after: unknown[], out: JsonChange[]) {
  const remaining = new Map<string, number>();
  for (const item of after) {
    const key = canonical(item);
    remaining.set(key, (remaining.get(key) ?? 0) + 1);
  }
  before.forEach((item, index) => {
    const key = canonical(item);
    const count = remaining.get(key) ?? 0;
    if (count > 0) remaining.set(key, count - 1);
    else out.push({ op: 'removed', path: childPath(path, index), value: item });
  });
  after.forEach((item, index) => {
    const key = canonical(item);
    const count = remaining.get(key) ?? 0;
    if (count > 0) {
      remaining.set(key, count - 1);
      out.push({ op: 'added', path: childPath(path, index), value: item });
    }
  });
}

function walk(path: string, before: unknown, after: unknown, mode: ArrayMode, out: JsonChange[]) {
  if (Array.isArray(before) && Array.isArray(after)) {
    if (mode === 'set') {
      diffArraysAsSet(path, before, after, out);
      return;
    }
    const length = Math.max(before.length, after.length);
    for (let index = 0; index < length; index++) {
      const child = childPath(path, index);
      if (index >= after.length) out.push({ op: 'removed', path: child, value: before[index] });
      else if (index >= before.length) out.push({ op: 'added', path: child, value: after[index] });
      else walk(child, before[index], after[index], mode, out);
    }
    return;
  }
  if (isObject(before) && isObject(after)) {
    for (const key of Object.keys(before)) {
      const child = childPath(path, key);
      if (!Object.hasOwn(after, key)) out.push({ op: 'removed', path: child, value: before[key] });
      else walk(child, before[key], after[key], mode, out);
    }
    for (const key of Object.keys(after)) {
      if (!Object.hasOwn(before, key))
        out.push({ op: 'added', path: childPath(path, key), value: after[key] });
    }
    return;
  }
  if (canonical(before) !== canonical(after)) out.push({ op: 'changed', path, before, after });
}

export function diffValues(
  before: unknown,
  after: unknown,
  mode: ArrayMode = 'index',
): JsonChange[] {
  const out: JsonChange[] = [];
  walk('$', before, after, mode, out);
  return out;
}

export function countChanges(changes: readonly JsonChange[]): JsonDiffCounts {
  return {
    added: changes.filter((change) => change.op === 'added').length,
    removed: changes.filter((change) => change.op === 'removed').length,
    changed: changes.filter((change) => change.op === 'changed').length,
  };
}

export function diffJson(left: string, right: string, mode: ArrayMode = 'index'): JsonDiffResult {
  const before = parseJsonValue(left);
  if (!before.ok) return { ok: false, side: 'left', error: before.error };
  const after = parseJsonValue(right);
  if (!after.ok) return { ok: false, side: 'right', error: after.error };
  const changes = diffValues(before.value, after.value, mode);
  return { ok: true, changes, counts: countChanges(changes) };
}

function show(value: unknown): string {
  return JSON.stringify(value as Json) ?? 'undefined';
}

export function formatChanges(changes: readonly JsonChange[]): string {
  return changes
    .map((change) => {
      if (change.op === 'added') return `+ ${change.path}: ${show(change.value)}`;
      if (change.op === 'removed') return `- ${change.path}: ${show(change.value)}`;
      return `~ ${change.path}: ${show(change.before)} → ${show(change.after)}`;
    })
    .join('\n');
}
