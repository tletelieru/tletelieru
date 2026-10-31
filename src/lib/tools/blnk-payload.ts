import { compare, formatTrimmed, multiply, normalize, parseDecimal, ZERO } from './_shared/decimal';

export interface BlnkFields {
  amount: string;
  precision: string;
  reference: string;
  currency: string;
  source: string;
  destination: string;
  description: string;
  allowOverdraft: boolean;
  inflight: boolean;
  skipQueue: boolean;
  metaData: string;
}

export type BlnkError =
  'amount' | 'precision' | 'reference' | 'currency' | 'source' | 'destination' | 'metaData';

export type BlnkResult =
  | { ok: true; output: string; preciseAmount: string; lossy: boolean }
  | { ok: false; errors: BlnkError[] };

function readMeta(text: string): Record<string, unknown> | null {
  if (text.trim() === '') return {};
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function buildBlnkPayload(fields: BlnkFields): BlnkResult {
  const errors: BlnkError[] = [];
  const amount = parseDecimal(fields.amount);
  if (!amount || compare(amount, ZERO) <= 0) errors.push('amount');
  const precision = parseDecimal(fields.precision);
  if (!precision || compare(precision, ZERO) <= 0 || normalize(precision).scale > 0) {
    errors.push('precision');
  }
  if (fields.reference.trim() === '') errors.push('reference');
  if (fields.currency.trim() === '') errors.push('currency');
  if (fields.source.trim() === '') errors.push('source');
  if (fields.destination.trim() === '') errors.push('destination');
  const meta = readMeta(fields.metaData);
  if (!meta) errors.push('metaData');
  if (!amount || !precision || !meta || errors.length > 0) return { ok: false, errors };

  const scaled = normalize(multiply(amount, precision));
  const entries: [string, string][] = [
    ['amount', formatTrimmed(amount)],
    ['precision', formatTrimmed(precision)],
    ['reference', JSON.stringify(fields.reference.trim())],
    ['currency', JSON.stringify(fields.currency.trim().toUpperCase())],
    ['source', JSON.stringify(fields.source.trim())],
    ['destination', JSON.stringify(fields.destination.trim())],
  ];
  if (fields.description.trim() !== '') {
    entries.push(['description', JSON.stringify(fields.description.trim())]);
  }
  entries.push(
    ['allow_overdraft', String(fields.allowOverdraft)],
    ['inflight', String(fields.inflight)],
    ['skip_queue', String(fields.skipQueue)],
  );
  if (Object.keys(meta).length > 0) {
    entries.push(['meta_data', JSON.stringify(meta, null, 2).replace(/\n/g, '\n  ')]);
  }

  return {
    ok: true,
    output: `{\n${entries.map(([key, value]) => `  "${key}": ${value}`).join(',\n')}\n}`,
    preciseAmount: formatTrimmed(scaled),
    lossy: scaled.scale > 0,
  };
}
