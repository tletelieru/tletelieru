export type MtType = '103' | '940';

export interface MtField {
  tag: string;
  value: string;
  parsed?: Record<string, string>;
}

export interface MtMessage {
  type: MtType | null;
  direction: 'input' | 'output' | null;
  blocks: Record<string, string>;
  fields: MtField[];
}

export type MtResult =
  { ok: true; message: MtMessage } | { ok: false; error: 'empty' | 'noFields' };

const FIELD_START = /^:(\d{2}[A-Z]?):(.*)$/;
const VALUE_DATE_AMOUNT = /^(\d{6})([A-Z]{3})([\d,]+)$/;
const CURRENCY_AMOUNT = /^([A-Z]{3})([\d,]+)$/;
const BALANCE = /^([CD])(\d{6})([A-Z]{3})([\d,]+)$/;
const STATEMENT_LINE =
  /^(\d{6})(\d{4})?(R?[DC])([A-Z])?([\d,]+)([SNF][A-Z0-9]{3})([^/\n]*)(?:\/\/([^\n]*))?(?:\n([\s\S]*))?$/;

export function swiftDate(text: string): string {
  return `20${text.slice(0, 2)}-${text.slice(2, 4)}-${text.slice(4, 6)}`;
}

export function swiftAmount(text: string): string {
  const [whole = '0', fraction = ''] = text.split(',');
  return fraction === '' ? whole : `${whole}.${fraction}`;
}

function splitBlocks(text: string): Record<string, string> | null {
  const blocks: Record<string, string> = {};
  let index = 0;
  while (index < text.length) {
    if (/\s/.test(text[index] ?? '')) {
      index++;
      continue;
    }
    const header = /^\{([0-9A-Z]+):/.exec(text.slice(index, index + 8));
    if (!header?.[1]) return null;
    let depth = 0;
    let end = index;
    for (; end < text.length; end++) {
      if (text[end] === '{') depth++;
      if (text[end] === '}') depth--;
      if (depth === 0) break;
    }
    if (depth !== 0) return null;
    blocks[header[1]] = text.slice(index + header[0].length, end);
    index = end + 1;
  }
  return blocks;
}

function parseField(tag: string, value: string): Record<string, string> | undefined {
  const flat = value.trim();
  if (tag === '32A') {
    const match = VALUE_DATE_AMOUNT.exec(flat);
    if (match) {
      const [, date = '', currency = '', amount = ''] = match;
      return { date: swiftDate(date), currency, amount: swiftAmount(amount) };
    }
  }
  if (tag === '33B' || tag === '32B') {
    const match = CURRENCY_AMOUNT.exec(flat);
    if (match) {
      const [, currency = '', amount = ''] = match;
      return { currency, amount: swiftAmount(amount) };
    }
  }
  if (/^6[0245]/.test(tag) && tag !== '61') {
    const match = BALANCE.exec(flat);
    if (match) {
      const [, mark = '', date = '', currency = '', amount = ''] = match;
      return { mark, date: swiftDate(date), currency, amount: swiftAmount(amount) };
    }
  }
  if (tag === '61') {
    const match = STATEMENT_LINE.exec(flat);
    if (match) {
      const [, date = '', entry, mark = '', funds, amount = '', type = '', reference = ''] = match;
      const [, , , , , , , , bankReference, details] = match;
      return {
        valueDate: swiftDate(date),
        ...(entry
          ? {
              entryDate: `${date.slice(0, 2)}${entry}`.replace(
                /^(\d{2})(\d{2})(\d{2})$/,
                '20$1-$2-$3',
              ),
            }
          : {}),
        mark,
        ...(funds ? { fundsCode: funds } : {}),
        amount: swiftAmount(amount),
        transactionType: type,
        reference: reference.trim(),
        ...(bankReference ? { bankReference: bankReference.trim() } : {}),
        ...(details ? { details: details.trim() } : {}),
      };
    }
  }
  return undefined;
}

function readFields(text: string): MtField[] {
  const fields: MtField[] = [];
  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim() === '-' || raw.trim() === '') continue;
    const start = FIELD_START.exec(raw);
    const last = fields[fields.length - 1];
    if (start) fields.push({ tag: start[1] ?? '', value: start[2] ?? '' });
    else if (last) last.value += `\n${raw}`;
  }
  return fields.map((field) => {
    const parsed = parseField(field.tag, field.value);
    return parsed ? { ...field, parsed } : field;
  });
}

function detectType(blocks: Record<string, string>, fields: readonly MtField[]): MtType | null {
  const code = /^[IO](\d{3})/.exec(blocks['2'] ?? '')?.[1];
  if (code === '103' || code === '940') return code;
  if (code) return null;
  const tags = new Set(fields.map((field) => field.tag));
  if (tags.has('61') || tags.has('60F') || tags.has('62F')) return '940';
  return tags.has('32A') && [...tags].some((tag) => tag.startsWith('59')) ? '103' : null;
}

export function parseMt(input: string): MtResult {
  const text = input.trim();
  if (text === '') return { ok: false, error: 'empty' };
  const blocks = (text.startsWith('{') ? splitBlocks(text) : null) ?? { '4': text };
  const fields = readFields(blocks['4'] ?? '');
  if (fields.length === 0) return { ok: false, error: 'noFields' };
  const direction = blocks['2']?.[0];
  const headers = Object.fromEntries(Object.entries(blocks).filter(([id]) => id !== '4'));
  return {
    ok: true,
    message: {
      type: detectType(blocks, fields),
      direction: direction === 'I' ? 'input' : direction === 'O' ? 'output' : null,
      blocks: headers,
      fields,
    },
  };
}
