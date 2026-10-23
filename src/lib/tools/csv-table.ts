import { cellKind, readCsvTable, type CsvDelimiter, type CsvParseError } from './csv';

export type TableStyle = 'box' | 'ascii' | 'markdown' | 'tsv';

export const tableStyles: readonly TableStyle[] = ['box', 'ascii', 'markdown', 'tsv'];

export interface CsvTableOptions {
  delimiter: CsvDelimiter;
  header: boolean;
  style: TableStyle;
  fence: boolean;
  alignNumbers: boolean;
  trimZeros: boolean;
}

export type CsvTableOutput =
  | { ok: true; output: string; stats: { rows: number; columns: number } }
  | { ok: false; error: CsvParseError };

const defaults: CsvTableOptions = {
  delimiter: 'auto',
  header: true,
  style: 'box',
  fence: true,
  alignNumbers: true,
  trimZeros: false,
};

type Rule = [string, string, string, string];

interface Borders {
  top: Rule;
  middle: Rule;
  bottom: Rule;
  vertical: string;
}

const BORDERS: Record<'box' | 'ascii', Borders> = {
  box: {
    top: ['┌', '┬', '┐', '─'],
    middle: ['├', '┼', '┤', '─'],
    bottom: ['└', '┴', '┘', '─'],
    vertical: '│',
  },
  ascii: {
    top: ['+', '+', '+', '-'],
    middle: ['+', '+', '+', '-'],
    bottom: ['+', '+', '+', '-'],
    vertical: '|',
  },
};

const width = (text: string) => [...text].length;

function pad(text: string, size: number, right: boolean): string {
  const fill = ' '.repeat(Math.max(0, size - width(text)));
  return right ? fill + text : text + fill;
}

export function trimNumber(cell: string): string {
  if (cellKind(cell) !== 'number' || !cell.includes('.') || /[eE]/.test(cell)) return cell;
  return cell.replace(/0+$/, '').replace(/\.$/, '');
}

type CellOptions = Pick<CsvTableOptions, 'style' | 'trimZeros'>;

function cleanCell(cell: string, options: CellOptions): string {
  const flat = cell.replace(/\r?\n|\r|\t/g, ' ').trim();
  const value = options.trimZeros ? trimNumber(flat) : flat;
  return options.style === 'markdown' ? value.replace(/\|/g, '\\|') : value;
}

function isNumericColumn(rows: readonly string[][], index: number): boolean {
  let numbers = 0;
  for (const row of rows) {
    const cell = row[index] ?? '';
    if (cell === '') continue;
    if (cellKind(cell) !== 'number') return false;
    numbers++;
  }
  return numbers > 0;
}

function rule([left, join, right, line]: Rule, widths: number[]): string {
  return left + widths.map((size) => line.repeat(size + 2)).join(join) + right;
}

function markdownRule(widths: number[], right: boolean[]): string {
  const cells = widths.map((size, index) => {
    const dashes = '-'.repeat(Math.max(3, size) - 1);
    return right[index] ? `${dashes}:` : `:${dashes}`;
  });
  return `| ${cells.join(' | ')} |`;
}

export function formatTable(
  header: string[] | null,
  body: string[][],
  options: Pick<CsvTableOptions, 'style' | 'alignNumbers'> & { trimZeros?: boolean },
): string {
  const columns = Math.max(header?.length ?? 0, ...body.map((row) => row.length));
  if (columns === 0) return '';
  const cell = { style: options.style, trimZeros: options.trimZeros ?? false };
  const normalize = (row: readonly string[]) =>
    Array.from({ length: columns }, (_, index) => cleanCell(row[index] ?? '', cell));
  const head = header && normalize(header);
  const rows = body.map(normalize);

  if (options.style === 'tsv') {
    return [...(head ? [head] : []), ...rows].map((row) => row.join('\t')).join('\n');
  }

  const right = Array.from(
    { length: columns },
    (_, index) => options.alignNumbers && isNumericColumn(rows, index),
  );
  const minimum = options.style === 'markdown' ? 3 : 1;
  const widths = Array.from({ length: columns }, (_, index) =>
    Math.max(minimum, ...[head, ...rows].map((row) => (row ? width(row[index] ?? '') : 0))),
  );
  const line = (row: string[], align: boolean, vertical: string) =>
    `${vertical} ${row
      .map((text, index) => pad(text, widths[index] ?? 0, align && (right[index] ?? false)))
      .join(` ${vertical} `)} ${vertical}`;

  if (options.style === 'markdown') {
    return [
      line(head ?? widths.map(() => ''), false, '|'),
      markdownRule(widths, right),
      ...rows.map((row) => line(row, true, '|')),
    ].join('\n');
  }

  const borders = BORDERS[options.style];
  return [
    rule(borders.top, widths),
    ...(head ? [line(head, false, borders.vertical), rule(borders.middle, widths)] : []),
    ...rows.map((row) => line(row, true, borders.vertical)),
    rule(borders.bottom, widths),
  ].join('\n');
}

export function csvToTable(input: string, options: Partial<CsvTableOptions> = {}): CsvTableOutput {
  const resolved = { ...defaults, ...options };
  if (input.trim() === '') return { ok: true, output: '', stats: { rows: 0, columns: 0 } };
  const read = readCsvTable(input, { delimiter: resolved.delimiter, header: resolved.header });
  if (!read.ok) return read;
  const { header, rows } = read.table;
  const body = rows.filter((row) => row.some((cell) => cell.trim() !== ''));
  const table = formatTable(header, body, resolved);
  const columns = Math.max(header?.length ?? 0, ...body.map((row) => row.length));
  const fenced = resolved.fence && resolved.style !== 'tsv' && table !== '';
  return {
    ok: true,
    output: fenced ? `\`\`\`\n${table}\n\`\`\`` : table,
    stats: { rows: body.length, columns },
  };
}
