import { describe, expect, it } from 'vitest';
import { generateTypes, goFieldName, jsonToTypes, pascalCase, singular } from './json-types';

const sample = {
  id: 1,
  user_name: 'ana',
  price: 9.5,
  tags: ['a'],
  deleted_at: null,
  items: [
    { sku: 'a', qty: 1 },
    { sku: 'b', note: 'x' },
    { sku: 'c', qty: null },
  ],
  'bad-key': true,
};

describe('generateTypes (TypeScript)', () => {
  it('merges array element shapes into optional and nullable fields', () => {
    expect(generateTypes(sample)).toBe(
      [
        'export interface Root {',
        '  id: number;',
        '  user_name: string;',
        '  price: number;',
        '  tags: string[];',
        '  deleted_at: null;',
        '  items: Item[];',
        '  "bad-key": boolean;',
        '}',
        '',
        'export interface Item {',
        '  sku: string;',
        '  qty?: number | null;',
        '  note?: string;',
        '}',
      ].join('\n'),
    );
  });

  it('uses the root name and wraps union arrays', () => {
    expect(generateTypes([1, 'a'], { rootName: 'my values' })).toBe(
      'export type MyValues = (string | number)[];',
    );
  });

  it('names root array elements', () => {
    expect(generateTypes([{ a: 1 }, { a: 2, b: true }])).toBe(
      [
        'export type Root = RootItem[];',
        '',
        'export interface RootItem {',
        '  a: number;',
        '  b?: boolean;',
        '}',
      ].join('\n'),
    );
  });

  it('renders empty arrays and objects', () => {
    expect(generateTypes({ list: [], obj: {} })).toBe(
      'export interface Root {\n  list: unknown[];\n  obj: Obj;\n}\n\nexport interface Obj {}',
    );
  });

  it('dedupes colliding type names', () => {
    const output = generateTypes({ item: { a: 1 }, items: [{ b: 1 }] });
    expect(output).toContain('item: Item;');
    expect(output).toContain('items: Item2[];');
  });
});

describe('generateTypes (Go)', () => {
  it('renders aligned structs with json tags', () => {
    expect(generateTypes(sample, { target: 'go' })).toBe(
      [
        'type Root struct {',
        '\tID        int64    `json:"id"`',
        '\tUserName  string   `json:"user_name"`',
        '\tPrice     float64  `json:"price"`',
        '\tTags      []string `json:"tags"`',
        '\tDeletedAt any      `json:"deleted_at"`',
        '\tItems     []Item   `json:"items"`',
        '\tBadKey    bool     `json:"bad-key"`',
        '}',
        '',
        'type Item struct {',
        '\tSku  string `json:"sku"`',
        '\tQty  *int64 `json:"qty,omitempty"`',
        '\tNote string `json:"note,omitempty"`',
        '}',
      ].join('\n'),
    );
  });

  it('uses pointers for optional nested structs and any for mixed values', () => {
    const output = generateTypes([{ child: { a: 1 }, mixed: 1 }, { mixed: 'x' }], {
      target: 'go',
    });
    expect(output).toContain('type Root []RootItem');
    expect(output).toContain('Child *Child `json:"child,omitempty"`');
    expect(output).toContain('Mixed any    `json:"mixed"`');
  });
});

describe('generateTypes (Zod)', () => {
  it('declares nested schemas before their parents', () => {
    expect(generateTypes({ user: { id: 1, email: null }, score: 1.5 }, { target: 'zod' })).toBe(
      [
        "import { z } from 'zod';",
        '',
        'export const UserSchema = z.object({',
        '  id: z.number().int(),',
        '  email: z.null(),',
        '});',
        '',
        'export type User = z.infer<typeof UserSchema>;',
        '',
        'export const RootSchema = z.object({',
        '  user: UserSchema,',
        '  score: z.number(),',
        '});',
        '',
        'export type Root = z.infer<typeof RootSchema>;',
      ].join('\n'),
    );
  });

  it('marks optional, nullable and union fields', () => {
    const output = generateTypes([{ a: 'x', b: 1 }, { a: null, b: 'y' }, { a: 'z' }], {
      target: 'zod',
    });
    expect(output).toContain('a: z.string().nullable(),');
    expect(output).toContain('b: z.union([z.string(), z.number().int()]).optional(),');
    expect(output).toContain('export const RootSchema = z.array(RootItemSchema);');
  });
});

describe('jsonToTypes', () => {
  it('returns the number of generated object types', () => {
    expect(jsonToTypes('{"a":{"b":{}}}')).toMatchObject({ ok: true, types: 3 });
  });

  it('reports invalid JSON', () => {
    expect(jsonToTypes('{"a":}')).toMatchObject({
      ok: false,
      error: { code: 'unexpected-close', line: 1, column: 6 },
    });
  });

  it('returns nothing for blank input', () => {
    expect(jsonToTypes('')).toEqual({ ok: true, output: '', types: 0 });
  });
});

describe('naming helpers', () => {
  it.each([
    ['user_profile', 'UserProfile'],
    ['userProfile', 'UserProfile'],
    ['HTTPServer', 'HttpServer'],
    ['2fa', 'T2fa'],
    ['', 'Root'],
  ])('pascalCase(%j)', (input, expected) => {
    expect(pascalCase(input)).toBe(expected);
  });

  it.each([
    ['Items', 'Item'],
    ['Categories', 'Category'],
    ['Boxes', 'Box'],
    ['Status', 'Status'],
    ['Data', 'Data'],
  ])('singular(%j)', (input, expected) => {
    expect(singular(input)).toBe(expected);
  });

  it.each([
    ['user_id', 'UserID'],
    ['avatarUrl', 'AvatarURL'],
    ['1st', 'F1st'],
    ['$', 'Field'],
  ])('goFieldName(%j)', (input, expected) => {
    expect(goFieldName(input)).toBe(expected);
  });
});
