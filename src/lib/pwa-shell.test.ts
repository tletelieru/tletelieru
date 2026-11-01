import { describe, expect, it } from 'vitest';
import { sharedChunks } from './pwa-shell';

const imports = {
  'page.js': ['client.js'],
  'client.js': [],
  'ToolIsland.js': ['ToolRoot.js'],
  'ToolRoot.js': [],
  'home.js': [],
  'YamlTool.js': ['yaml.js'],
  'yaml.js': [],
};

describe('sharedChunks', () => {
  it('keeps chunks most pages load, including their static imports', () => {
    const pages = [
      ['page.js', 'ToolIsland.js'],
      ['page.js', 'ToolIsland.js'],
      ['page.js', 'home.js'],
    ];
    expect([...sharedChunks(pages, imports)].sort()).toEqual([
      'ToolIsland.js',
      'ToolRoot.js',
      'client.js',
      'page.js',
    ]);
  });

  it('leaves out chunks no page references directly', () => {
    expect(sharedChunks([['page.js']], imports).has('YamlTool.js')).toBe(false);
  });

  it('handles import cycles and unknown chunks', () => {
    const cyclic = { 'a.js': ['b.js'], 'b.js': ['a.js'] };
    expect(sharedChunks([['a.js', 'missing.js']], cyclic).size).toBe(3);
  });
});
