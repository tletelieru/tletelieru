import { diffArrays } from 'diff';

export type DiffView = 'split' | 'unified';
export const diffViews: readonly DiffView[] = ['split', 'unified'];

export interface TextDiffOptions {
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
  context: number;
}

export type DiffLineKind = 'same' | 'added' | 'removed';

export interface DiffLine {
  kind: DiffLineKind;
  text: string;
  oldLine: number | null;
  newLine: number | null;
}

export interface SplitRow {
  left: DiffLine | null;
  right: DiffLine | null;
}

export interface TextDiffResult {
  lines: DiffLine[];
  added: number;
  removed: number;
  identical: boolean;
}

export function splitTextLines(text: string): string[] {
  if (text === '') return [];
  const lines = text.split(/\r\n|\r|\n/);
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function normalizer({ ignoreWhitespace, ignoreCase }: Partial<TextDiffOptions>) {
  return (line: string) => {
    const spaced = ignoreWhitespace ? line.replace(/\s+/g, ' ').trim() : line;
    return ignoreCase ? spaced.toLowerCase() : spaced;
  };
}

export function diffText(
  before: string,
  after: string,
  options: Partial<TextDiffOptions> = {},
): TextDiffResult {
  const normalize = normalizer(options);
  const changes = diffArrays(splitTextLines(before), splitTextLines(after), {
    comparator: (left, right) => normalize(left) === normalize(right),
  });
  const lines: DiffLine[] = [];
  let oldLine = 1;
  let newLine = 1;
  let added = 0;
  let removed = 0;
  for (const change of changes) {
    for (const text of change.value) {
      if (change.added) {
        lines.push({ kind: 'added', text, oldLine: null, newLine: newLine++ });
        added++;
      } else if (change.removed) {
        lines.push({ kind: 'removed', text, oldLine: oldLine++, newLine: null });
        removed++;
      } else {
        lines.push({ kind: 'same', text, oldLine: oldLine++, newLine: newLine++ });
      }
    }
  }
  return { lines, added, removed, identical: added === 0 && removed === 0 };
}

export function splitRows(lines: readonly DiffLine[]): SplitRow[] {
  const rows: SplitRow[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line) break;
    if (line.kind === 'same') {
      rows.push({ left: line, right: line });
      index++;
      continue;
    }
    const removed: DiffLine[] = [];
    const added: DiffLine[] = [];
    while (lines[index]?.kind === 'removed') removed.push(lines[index++] as DiffLine);
    while (lines[index]?.kind === 'added') added.push(lines[index++] as DiffLine);
    for (let offset = 0; offset < Math.max(removed.length, added.length); offset++) {
      rows.push({ left: removed[offset] ?? null, right: added[offset] ?? null });
    }
  }
  return rows;
}

function range(start: number, count: number): string {
  return count === 1 ? `${start}` : `${count === 0 ? start - 1 : start},${count}`;
}

export function unifiedDiff(
  lines: readonly DiffLine[],
  { context = 3, oldName = 'original', newName = 'changed' } = {},
): string {
  const changed = lines.flatMap((line, index) => (line.kind === 'same' ? [] : [index]));
  if (changed.length === 0) return '';
  const hunks: [number, number][] = [];
  for (const index of changed) {
    const start = Math.max(0, index - context);
    const end = Math.min(lines.length - 1, index + context);
    const last = hunks[hunks.length - 1];
    if (last && start <= last[1] + 1) last[1] = Math.max(last[1], end);
    else hunks.push([start, end]);
  }
  const out = [`--- ${oldName}`, `+++ ${newName}`];
  for (const [start, end] of hunks) {
    const slice = lines.slice(start, end + 1);
    const before = lines.slice(0, start);
    const oldStart = before.filter((line) => line.kind !== 'added').length + 1;
    const newStart = before.filter((line) => line.kind !== 'removed').length + 1;
    const oldCount = slice.filter((line) => line.kind !== 'added').length;
    const newCount = slice.filter((line) => line.kind !== 'removed').length;
    out.push(`@@ -${range(oldStart, oldCount)} +${range(newStart, newCount)} @@`);
    for (const line of slice) {
      const prefix = line.kind === 'added' ? '+' : line.kind === 'removed' ? '-' : ' ';
      out.push(`${prefix}${line.text}`);
    }
  }
  return out.join('\n');
}
