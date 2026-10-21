export function splitLines(input: string): string[] {
  return input.split(/\r\n|\r|\n/);
}

export function joinLines(lines: readonly string[]): string {
  return lines.join('\n');
}

export function mapLines(input: string, map: (line: string) => string): string {
  return joinLines(splitLines(input).map(map));
}

export function unescapeSeparator(value: string): string {
  return value.replace(/\\([nt\\])/g, (_, char: string) =>
    char === 'n' ? '\n' : char === 't' ? '\t' : '\\',
  );
}

const CHUNK = /\d+|\D+/g;

function compareText(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function compareDigits(a: string, b: string): number {
  const x = a.replace(/^0+/, '');
  const y = b.replace(/^0+/, '');
  if (x.length !== y.length) return x.length - y.length;
  return compareText(x, y);
}

export function naturalCompare(a: string, b: string): number {
  const left = a.match(CHUNK) ?? [];
  const right = b.match(CHUNK) ?? [];
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index++) {
    const x = left[index] ?? '';
    const y = right[index] ?? '';
    const digits = /^\d/.test(x) && /^\d/.test(y);
    const result = digits ? compareDigits(x, y) : compareText(x.toLowerCase(), y.toLowerCase());
    if (result) return result;
  }
  return left.length - right.length || compareText(a, b);
}
