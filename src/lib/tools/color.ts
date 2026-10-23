export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export interface Oklch {
  l: number;
  c: number;
  h: number;
}

export type ColorError = { code: 'empty' } | { code: 'invalid'; input: string };

export type ColorResult = { ok: true; color: Rgba } | { ok: false; error: ColorError };

const NAMED: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  lime: '#00ff00',
  blue: '#0000ff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  aqua: '#00ffff',
  magenta: '#ff00ff',
  fuchsia: '#ff00ff',
  gray: '#808080',
  grey: '#808080',
  silver: '#c0c0c0',
  maroon: '#800000',
  olive: '#808000',
  navy: '#000080',
  purple: '#800080',
  teal: '#008080',
  orange: '#ffa500',
  pink: '#ffc0cb',
  rebeccapurple: '#663399',
  transparent: '#00000000',
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function parseHex(text: string): Rgba | null {
  const match = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(text);
  if (!match?.[1]) return null;
  let hex = match[1];
  if (hex.length <= 4) hex = [...hex].map((char) => char + char).join('');
  const value = (offset: number) => parseInt(hex.slice(offset, offset + 2), 16);
  return { r: value(0), g: value(2), b: value(4), a: hex.length === 8 ? value(6) / 255 : 1 };
}

function parseNumber(token: string, scale: number): number | null {
  const match = /^(-?(?:\d+\.?\d*|\.\d+))(%?)$/.exec(token);
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  return match[2] ? (value / 100) * scale : value;
}

function parseHue(token: string): number | null {
  const match = /^(-?(?:\d+\.?\d*|\.\d+))(deg|rad|turn|grad)?$/.exec(token);
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  const unit = match[2];
  if (unit === 'rad') return (value * 180) / Math.PI;
  if (unit === 'turn') return value * 360;
  if (unit === 'grad') return value * 0.9;
  return value;
}

function functionArgs(text: string, names: string[]): string[] | null {
  const match = /^([a-z]+)\((.*)\)$/i.exec(text);
  if (!match?.[1] || !names.includes(match[1].toLowerCase())) return null;
  return (match[2] ?? '').replace(/[,/]/g, ' ').trim().split(/\s+/).filter(Boolean);
}

function alphaArg(token: string | undefined): number | null {
  if (token === undefined) return 1;
  const value = parseNumber(token, 1);
  return value === null ? null : clamp(value, 0, 1);
}

export function hslToRgb({ h, s, l }: Hsl): { r: number; g: number; b: number } {
  const hue = (((h % 360) + 360) % 360) / 360;
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;
  const k = (n: number) => (n + hue * 12) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 };
}

export function rgbToHsl({ r, g, b }: Rgba): Hsl {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const light = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return { h: 0, s: 0, l: light * 100 };
  const sat = delta / (1 - Math.abs(2 * light - 1));
  let hue: number;
  if (max === red) hue = ((green - blue) / delta) % 6;
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;
  return { h: (hue * 60 + 360) % 360, s: sat * 100, l: light * 100 };
}

function toLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function fromLinear(value: number): number {
  const encoded = value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
  return encoded * 255;
}

export function rgbToOklch({ r, g, b }: Rgba): Oklch {
  const red = toLinear(r);
  const green = toLinear(g);
  const blue = toLinear(b);
  const l = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
  const m = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
  const s = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.sqrt(A * A + B * B);
  const h = c < 1e-4 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}

export function oklchToRgb({ l, c, h }: Oklch): { r: number; g: number; b: number } {
  const angle = (h * Math.PI) / 180;
  const A = c * Math.cos(angle);
  const B = c * Math.sin(angle);
  const lp = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const mp = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const sp = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return {
    r: fromLinear(4.0767416621 * lp - 3.3077115913 * mp + 0.2309699292 * sp),
    g: fromLinear(-1.2684380046 * lp + 2.6097574011 * mp - 0.3413193965 * sp),
    b: fromLinear(-0.0041960863 * lp - 0.7034186147 * mp + 1.707614701 * sp),
  };
}

function finish(rgb: { r: number; g: number; b: number }, a: number): Rgba {
  return {
    r: clamp(Math.round(rgb.r), 0, 255),
    g: clamp(Math.round(rgb.g), 0, 255),
    b: clamp(Math.round(rgb.b), 0, 255),
    a,
  };
}

export function parseColor(input: string): ColorResult {
  const text = input.trim().toLowerCase();
  if (!text) return { ok: false, error: { code: 'empty' } };
  const invalid: ColorResult = { ok: false, error: { code: 'invalid', input: input.trim() } };
  const named = NAMED[text];
  const hex = parseHex(named ?? text);
  if (hex) return { ok: true, color: hex };
  const rgb = functionArgs(text, ['rgb', 'rgba']);
  if (rgb) {
    if (rgb.length < 3 || rgb.length > 4) return invalid;
    const [r, g, b] = rgb.slice(0, 3).map((token) => parseNumber(token, 255));
    const a = alphaArg(rgb[3]);
    if (r == null || g == null || b == null || a === null) return invalid;
    return { ok: true, color: finish({ r, g, b }, a) };
  }
  const hsl = functionArgs(text, ['hsl', 'hsla']);
  if (hsl) {
    if (hsl.length < 3 || hsl.length > 4) return invalid;
    const h = parseHue(hsl[0] ?? '');
    const s = parseNumber((hsl[1] ?? '').replace(/%$/, ''), 100);
    const l = parseNumber((hsl[2] ?? '').replace(/%$/, ''), 100);
    const a = alphaArg(hsl[3]);
    if (h === null || s === null || l === null || a === null) return invalid;
    return { ok: true, color: finish(hslToRgb({ h, s, l }), a) };
  }
  const oklch = functionArgs(text, ['oklch']);
  if (oklch) {
    if (oklch.length < 3 || oklch.length > 4) return invalid;
    const l = parseNumber(oklch[0] ?? '', 1);
    const c = parseNumber(oklch[1] ?? '', 0.4);
    const h = parseHue(oklch[2] ?? '');
    const a = alphaArg(oklch[3]);
    if (l === null || c === null || h === null || a === null) return invalid;
    return { ok: true, color: finish(oklchToRgb({ l, c, h }), a) };
  }
  return invalid;
}

const round = (value: number, digits = 0) => Number(value.toFixed(digits));
const hex2 = (value: number) => value.toString(16).padStart(2, '0');

export function toHex({ r, g, b, a }: Rgba): string {
  const alpha = a < 1 ? hex2(Math.round(a * 255)) : '';
  return `#${hex2(r)}${hex2(g)}${hex2(b)}${alpha}`;
}

export function toRgbString({ r, g, b, a }: Rgba): string {
  return a < 1 ? `rgb(${r} ${g} ${b} / ${round(a, 3)})` : `rgb(${r} ${g} ${b})`;
}

export function toHslString(color: Rgba): string {
  const { h, s, l } = rgbToHsl(color);
  const body = `${round(h, 1)} ${round(s, 1)}% ${round(l, 1)}%`;
  return color.a < 1 ? `hsl(${body} / ${round(color.a, 3)})` : `hsl(${body})`;
}

export function toOklchString(color: Rgba): string {
  const { l, c, h } = rgbToOklch(color);
  const body = `${round(l * 100, 2)}% ${round(c, 4)} ${round(h, 2)}`;
  return color.a < 1 ? `oklch(${body} / ${round(color.a, 3)})` : `oklch(${body})`;
}

export function relativeLuminance({ r, g, b }: Rgba): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function blend(top: Rgba, bottom: Rgba): Rgba {
  const mix = (front: number, back: number) => front * top.a + back * (1 - top.a);
  return finish({ r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b) }, 1);
}

export interface ContrastReport {
  ratio: number;
  aa: boolean;
  aaLarge: boolean;
  aaa: boolean;
  aaaLarge: boolean;
}

export function contrast(foreground: Rgba, background: Rgba): ContrastReport {
  const base = blend(background, { r: 255, g: 255, b: 255, a: 1 });
  const front = blend(foreground, base);
  const a = relativeLuminance(front);
  const b = relativeLuminance(base);
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  return { ratio, aa: ratio >= 4.5, aaLarge: ratio >= 3, aaa: ratio >= 7, aaaLarge: ratio >= 4.5 };
}

export function describeColor(color: Rgba): string {
  return [toHex(color), toRgbString(color), toHslString(color), toOklchString(color)].join('\n');
}
