import { describe, expect, it } from 'vitest';
import {
  contrast,
  describeColor,
  parseColor,
  rgbToOklch,
  toHex,
  toHslString,
  toOklchString,
  toRgbString,
  type Rgba,
} from './color';

function color(input: string): Rgba {
  const result = parseColor(input);
  if (!result.ok) throw new Error(input);
  return result.color;
}

describe('parseColor', () => {
  it.each([
    ['#369', { r: 51, g: 102, b: 153, a: 1 }],
    ['336699', { r: 51, g: 102, b: 153, a: 1 }],
    ['#33669980', { r: 51, g: 102, b: 153, a: 128 / 255 }],
    ['rgb(51, 102, 153)', { r: 51, g: 102, b: 153, a: 1 }],
    ['rgba(255 0 0 / 50%)', { r: 255, g: 0, b: 0, a: 0.5 }],
    ['rgb(100% 0% 0%)', { r: 255, g: 0, b: 0, a: 1 }],
    ['hsl(210 50% 40%)', { r: 51, g: 102, b: 153, a: 1 }],
    ['hsla(0.5turn, 100%, 50%, 0.25)', { r: 0, g: 255, b: 255, a: 0.25 }],
    ['oklch(62.8% 0.2577 29.23)', { r: 255, g: 0, b: 0, a: 1 }],
    ['RebeccaPurple', { r: 102, g: 51, b: 153, a: 1 }],
  ])('parses %j', (input, expected) => {
    expect(parseColor(input)).toEqual({ ok: true, color: expected });
  });

  it.each(['#12', 'rgb(1, 2)', 'hsl(a b c)', 'nope', 'oklch(1 2)'])('rejects %j', (input) => {
    expect(parseColor(input)).toEqual({ ok: false, error: { code: 'invalid', input } });
  });

  it('reports empty input', () => {
    expect(parseColor(' ')).toEqual({ ok: false, error: { code: 'empty' } });
  });
});

describe('formatting', () => {
  it('formats every notation', () => {
    expect(describeColor(color('#336699'))).toBe(
      '#336699\nrgb(51 102 153)\nhsl(210 50% 40%)\noklch(49.93% 0.0987 250.43)',
    );
  });

  it('adds alpha when translucent', () => {
    const translucent = color('rgb(255 0 0 / 0.5)');
    expect(toHex(translucent)).toBe('#ff000080');
    expect(toRgbString(translucent)).toBe('rgb(255 0 0 / 0.5)');
    expect(toHslString(translucent)).toBe('hsl(0 100% 50% / 0.5)');
    expect(toOklchString(translucent)).toBe('oklch(62.8% 0.2577 29.23 / 0.5)');
  });

  it('gives grays zero chroma', () => {
    expect(rgbToOklch(color('#808080')).h).toBe(0);
  });
});

describe('contrast', () => {
  it('computes WCAG ratios', () => {
    expect(contrast(color('black'), color('white')).ratio).toBeCloseTo(21, 5);
    expect(contrast(color('#777'), color('#fff'))).toMatchObject({
      aa: false,
      aaLarge: true,
      aaa: false,
    });
    expect(contrast(color('#777'), color('#fff')).ratio).toBeCloseTo(4.48, 2);
  });

  it('blends translucent foregrounds over the background', () => {
    expect(contrast(color('#00000000'), color('#fff')).ratio).toBeCloseTo(1, 5);
  });
});
