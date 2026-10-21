import { getOperation } from './operations';
import { resolveOptions } from './options';
import type { PipelineStep } from './types';

export const MAX_STEPS = 50;

function encodeValue(value: string): string {
  return encodeURIComponent(value);
}

function decodeValue(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function normalizeStep(step: PipelineStep): PipelineStep | null {
  const operation = getOperation(step.op);
  if (!operation) return null;
  return { op: operation.id, options: resolveOptions(operation.options, step.options) };
}

export function encodeStep(step: PipelineStep): string | null {
  const operation = getOperation(step.op);
  if (!operation) return null;
  const options = resolveOptions(operation.options, step.options);
  const pairs = operation.options
    .filter((spec) => options[spec.key] !== spec.default)
    .map((spec) => `${spec.key}=${encodeValue(options[spec.key] ?? '')}`);
  return pairs.length ? `${operation.id}:${pairs.join(',')}` : operation.id;
}

export function encodeSteps(steps: readonly PipelineStep[]): string {
  return steps
    .slice(0, MAX_STEPS)
    .map(encodeStep)
    .filter((step): step is string => step !== null)
    .join('|');
}

function decodeStep(raw: string): PipelineStep | null {
  const colon = raw.indexOf(':');
  const id = (colon === -1 ? raw : raw.slice(0, colon)).trim();
  const operation = getOperation(id);
  if (!operation) return null;
  const options: Record<string, string> = {};
  const body = colon === -1 ? '' : raw.slice(colon + 1);
  for (const pair of body.split(',')) {
    const equals = pair.indexOf('=');
    if (equals <= 0) continue;
    const key = pair.slice(0, equals);
    const value = decodeValue(pair.slice(equals + 1));
    if (value !== null && !Object.hasOwn(options, key)) options[key] = value;
  }
  return { op: operation.id, options: resolveOptions(operation.options, options) };
}

export function decodeSteps(raw: string): PipelineStep[] {
  if (!raw.trim()) return [];
  return raw
    .split('|')
    .map(decodeStep)
    .filter((step): step is PipelineStep => step !== null)
    .slice(0, MAX_STEPS);
}
