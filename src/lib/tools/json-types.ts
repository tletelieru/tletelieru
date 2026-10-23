import { parseJsonValue, type JsonError } from './json';

export type TypesTarget = 'typescript' | 'go' | 'zod';

export const typesTargets: readonly TypesTarget[] = ['typescript', 'go', 'zod'];

export interface TypeSet {
  null: boolean;
  string: boolean;
  boolean: boolean;
  number: boolean;
  float: boolean;
  array: TypeSet | null;
  object: ObjectShape | null;
}

export interface ObjectShape {
  count: number;
  fields: Map<string, FieldShape>;
}

export interface FieldShape {
  type: TypeSet;
  seen: number;
}

interface NamedObject {
  name: string;
  shape: ObjectShape;
}

export type JsonTypesResult =
  { ok: true; output: string; types: number } | { ok: false; error: JsonError };

export interface JsonTypesOptions {
  target: TypesTarget;
  rootName: string;
}

export function emptyTypeSet(): TypeSet {
  return {
    null: false,
    string: false,
    boolean: false,
    number: false,
    float: false,
    array: null,
    object: null,
  };
}

function mergeObjects(a: ObjectShape, b: ObjectShape): ObjectShape {
  const fields = new Map<string, FieldShape>();
  for (const [key, field] of a.fields) fields.set(key, { ...field });
  for (const [key, field] of b.fields) {
    const existing = fields.get(key);
    fields.set(
      key,
      existing
        ? { type: mergeTypes(existing.type, field.type), seen: existing.seen + field.seen }
        : { ...field },
    );
  }
  return { count: a.count + b.count, fields };
}

export function mergeTypes(a: TypeSet, b: TypeSet): TypeSet {
  return {
    null: a.null || b.null,
    string: a.string || b.string,
    boolean: a.boolean || b.boolean,
    number: a.number || b.number,
    float: a.float || b.float,
    array: a.array && b.array ? mergeTypes(a.array, b.array) : (a.array ?? b.array),
    object: a.object && b.object ? mergeObjects(a.object, b.object) : (a.object ?? b.object),
  };
}

export function inferTypes(value: unknown): TypeSet {
  const set = emptyTypeSet();
  if (value === null) return { ...set, null: true };
  if (typeof value === 'string') return { ...set, string: true };
  if (typeof value === 'boolean') return { ...set, boolean: true };
  if (typeof value === 'number') return { ...set, number: true, float: !Number.isInteger(value) };
  if (Array.isArray(value)) {
    return { ...set, array: value.map(inferTypes).reduce(mergeTypes, emptyTypeSet()) };
  }
  const fields = new Map<string, FieldShape>();
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    fields.set(key, { type: inferTypes(item), seen: 1 });
  }
  return { ...set, object: { count: 1, fields } };
}

function words(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function pascalCase(text: string, fallback = 'Root'): string {
  const name = words(text).map(capitalize).join('');
  if (!name) return fallback;
  return /^\d/.test(name) ? `T${name}` : name;
}

export function singular(word: string): string {
  if (/ies$/i.test(word) && word.length > 3) return `${word.slice(0, -3)}y`;
  if (/(ss|us|is)$/i.test(word)) return word;
  if (/(ses|xes|zes|ches|shes)$/i.test(word)) return word.slice(0, -2);
  if (/s$/i.test(word) && word.length > 1) return word.slice(0, -1);
  return word;
}

class Namer {
  private readonly used = new Set<string>();

  take(base: string): string {
    let name = base;
    for (let index = 2; this.used.has(name); index++) name = `${base}${index}`;
    this.used.add(name);
    return name;
  }
}

function collectObjects(root: TypeSet, rootName: string): NamedObject[] {
  const namer = new Namer();
  const objects: NamedObject[] = [];
  const visit = (set: TypeSet, name: string): void => {
    if (set.object) {
      objects.push({ name: namer.take(name), shape: set.object });
      for (const [key, field] of set.object.fields) visit(field.type, pascalCase(key, 'Field'));
    }
    if (set.array) visit(set.array, singularName(name));
  };
  visit(root, rootName);
  return objects;
}

function singularName(name: string): string {
  const single = singular(name);
  return single === name ? `${name}Item` : single;
}

function objectNameFor(objects: NamedObject[], shape: ObjectShape): string {
  return objects.find((item) => item.shape === shape)?.name ?? 'unknown';
}

function block(lines: readonly string[]): string {
  return lines.length > 0 ? `{\n${lines.join('\n')}\n}` : '{}';
}

const TS_IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

function tsKey(key: string): string {
  return TS_IDENTIFIER.test(key) ? key : JSON.stringify(key);
}

function tsType(set: TypeSet, objects: NamedObject[]): string {
  const parts: string[] = [];
  if (set.string) parts.push('string');
  if (set.number) parts.push('number');
  if (set.boolean) parts.push('boolean');
  if (set.object) parts.push(objectNameFor(objects, set.object));
  if (set.array) {
    const item = tsType(set.array, objects);
    parts.push(/[ |]/.test(item) ? `(${item})[]` : `${item}[]`);
  }
  if (set.null) parts.push('null');
  if (parts.length === 0) return 'unknown';
  return parts.join(' | ');
}

function renderTypeScript(root: TypeSet, rootName: string, objects: NamedObject[]): string {
  const blocks = objects.map(({ name, shape }) => {
    const lines = [...shape.fields].map(([key, field]) => {
      const optional = field.seen < shape.count ? '?' : '';
      return `  ${tsKey(key)}${optional}: ${tsType(field.type, objects)};`;
    });
    return `export interface ${name} ${block(lines)}`;
  });
  if (!root.object || hasOtherTypes(root)) {
    blocks.unshift(`export type ${rootTypeName(rootName, objects)} = ${tsType(root, objects)};`);
  }
  return blocks.join('\n\n');
}

function hasOtherTypes(set: TypeSet): boolean {
  return set.null || set.string || set.number || set.boolean || set.array !== null;
}

function rootTypeName(rootName: string, objects: NamedObject[]): string {
  return objects.some((item) => item.name === rootName) ? `${rootName}Value` : rootName;
}

const GO_INITIALISMS = new Set([
  'id',
  'url',
  'uri',
  'api',
  'http',
  'https',
  'json',
  'sql',
  'uuid',
  'ip',
  'html',
  'xml',
  'ui',
  'db',
]);

export function goFieldName(key: string): string {
  const name = words(key)
    .map((word) => (GO_INITIALISMS.has(word.toLowerCase()) ? word.toUpperCase() : capitalize(word)))
    .join('');
  if (!name) return 'Field';
  return /^\d/.test(name) ? `F${name}` : name;
}

function goBase(set: TypeSet, objects: NamedObject[]): string | null {
  const kinds = [
    set.string,
    set.number,
    set.boolean,
    set.object !== null,
    set.array !== null,
  ].filter(Boolean).length;
  if (kinds !== 1) return null;
  if (set.string) return 'string';
  if (set.number) return set.float ? 'float64' : 'int64';
  if (set.boolean) return 'bool';
  if (set.object) return objectNameFor(objects, set.object);
  if (set.array) return `[]${goType(set.array, objects, false)}`;
  return null;
}

function goType(set: TypeSet, objects: NamedObject[], optional: boolean): string {
  const base = goBase(set, objects);
  if (base === null) return 'any';
  if (base.startsWith('[]')) return base;
  return set.null || (optional && set.object !== null) ? `*${base}` : base;
}

function alignColumns(rows: string[][]): string[] {
  const widths = rows.reduce<number[]>(
    (acc, row) => row.map((cell, index) => Math.max(acc[index] ?? 0, cell.length)),
    [],
  );
  return rows.map((row) =>
    row
      .map((cell, index) => (index < row.length - 1 ? cell.padEnd(widths[index] ?? 0) : cell))
      .join(' '),
  );
}

function renderGo(root: TypeSet, rootName: string, objects: NamedObject[]): string {
  const blocks = objects.map(({ name, shape }) => {
    const names = new Namer();
    const rows = [...shape.fields].map(([key, field]) => {
      const optional = field.seen < shape.count;
      const tag = `\`json:"${key.replace(/[\\"]/g, '\\$&')}${optional ? ',omitempty' : ''}"\``;
      return [names.take(goFieldName(key)), goType(field.type, objects, optional), tag];
    });
    const body = alignColumns(rows).map((line) => `\t${line}`);
    return `type ${name} struct ${block(body)}`;
  });
  if (!root.object || hasOtherTypes(root)) {
    blocks.unshift(`type ${rootTypeName(rootName, objects)} ${goType(root, objects, false)}`);
  }
  return blocks.join('\n\n');
}

function zodBase(set: TypeSet, objects: NamedObject[]): string[] {
  const parts: string[] = [];
  if (set.string) parts.push('z.string()');
  if (set.number) parts.push(set.float ? 'z.number()' : 'z.number().int()');
  if (set.boolean) parts.push('z.boolean()');
  if (set.object) parts.push(`${objectNameFor(objects, set.object)}Schema`);
  if (set.array) parts.push(`z.array(${zodType(set.array, objects)})`);
  return parts;
}

function zodType(set: TypeSet, objects: NamedObject[]): string {
  const parts = zodBase(set, objects);
  if (parts.length === 0) return set.null ? 'z.null()' : 'z.unknown()';
  const base = parts.length === 1 ? (parts[0] ?? '') : `z.union([${parts.join(', ')}])`;
  return set.null ? `${base}.nullable()` : base;
}

function renderZod(root: TypeSet, rootName: string, objects: NamedObject[]): string {
  const blocks = [...objects].reverse().map(({ name, shape }) => {
    const lines = [...shape.fields].map(([key, field]) => {
      const optional = field.seen < shape.count ? '.optional()' : '';
      return `  ${tsKey(key)}: ${zodType(field.type, objects)}${optional},`;
    });
    return `export const ${name}Schema = z.object(${block(lines)});\n\nexport type ${name} = z.infer<typeof ${name}Schema>;`;
  });
  if (!root.object || hasOtherTypes(root)) {
    const name = rootTypeName(rootName, objects);
    blocks.push(
      `export const ${name}Schema = ${zodType(root, objects)};\n\nexport type ${name} = z.infer<typeof ${name}Schema>;`,
    );
  }
  return [`import { z } from 'zod';`, ...blocks].join('\n\n');
}

function render(value: unknown, options: Partial<JsonTypesOptions>) {
  const target = options.target ?? 'typescript';
  const rootName = pascalCase(options.rootName ?? '', 'Root');
  const root = inferTypes(value);
  const objects = collectObjects(root, rootName);
  const renderer = target === 'go' ? renderGo : target === 'zod' ? renderZod : renderTypeScript;
  return { output: renderer(root, rootName, objects), types: objects.length };
}

export function generateTypes(value: unknown, options: Partial<JsonTypesOptions> = {}): string {
  return render(value, options).output;
}

export function jsonToTypes(
  input: string,
  options: Partial<JsonTypesOptions> = {},
): JsonTypesResult {
  if (!input.trim()) return { ok: true, output: '', types: 0 };
  const parsed = parseJsonValue(input);
  if (!parsed.ok) return parsed;
  return { ok: true, ...render(parsed.value, options) };
}
