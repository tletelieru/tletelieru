export type HtmlBackground = 'light' | 'dark';
export type HtmlViewport = 'mobile' | 'tablet' | 'desktop';

export interface SrcDocOptions {
  allowScripts?: boolean;
  background?: HtmlBackground;
}

export const viewportWidths: Record<HtmlViewport, number | null> = {
  mobile: 375,
  tablet: 768,
  desktop: null,
};

export const backgroundColors: Record<HtmlBackground, { background: string; color: string }> = {
  light: { background: '#ffffff', color: '#1a1a1a' },
  dark: { background: '#121212', color: '#e6e6e6' },
};

const FULL_DOCUMENT = /^(?:\s|<!--[\s\S]*?-->)*<(?:!doctype\s+html|html[\s>]|head[\s>]|body[\s>])/i;
const HEAD_OPEN = /<head(?:\s[^>]*)?>/i;
const HTML_OPEN = /<html(?:\s[^>]*)?>/i;
const DOCTYPE = /<!doctype[^>]*>/i;

export function isFullDocument(html: string): boolean {
  return FULL_DOCUMENT.test(html.replace(/^\uFEFF/, ''));
}

export function buildCsp(allowScripts: boolean): string {
  const directives = [
    "default-src 'none'",
    'img-src data: blob:',
    'media-src data: blob:',
    'font-src data:',
    "style-src 'unsafe-inline'",
    "form-action 'none'",
    "base-uri 'none'",
  ];
  if (allowScripts) directives.push("script-src 'unsafe-inline'");
  return directives.join('; ');
}

export function sandboxFor(allowScripts: boolean): string {
  return allowScripts ? 'allow-scripts' : '';
}

export function viewportWidth(viewport: HtmlViewport): string {
  const width = viewportWidths[viewport];
  return width === null ? '100%' : `${width}px`;
}

export function buildBaseStyle(background: HtmlBackground): string {
  const { background: bg, color } = backgroundColors[background];
  return [
    `:root { color-scheme: ${background}; }`,
    `html { background: ${bg}; color: ${color}; }`,
    'body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; line-height: 1.5; }',
  ].join(' ');
}

export function buildHead({ allowScripts = false, background = 'light' }: SrcDocOptions): string {
  return [
    '<meta charset="utf-8">',
    `<meta http-equiv="Content-Security-Policy" content="${buildCsp(allowScripts)}">`,
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<style>${buildBaseStyle(background)}</style>`,
  ].join('\n');
}

function insertAfter(html: string, pattern: RegExp, insertion: string): string | null {
  const match = pattern.exec(html);
  if (!match) return null;
  const end = match.index + match[0].length;
  return `${html.slice(0, end)}\n${insertion}\n${html.slice(end)}`;
}

export function buildSrcDoc(html: string, options: SrcDocOptions = {}): string {
  const source = html.replace(/^\uFEFF/, '');
  const head = buildHead(options);
  if (isFullDocument(source)) {
    return (
      insertAfter(source, HEAD_OPEN, head) ??
      insertAfter(source, HTML_OPEN, `<head>\n${head}\n</head>`) ??
      insertAfter(source, DOCTYPE, `<head>\n${head}\n</head>`) ??
      `<head>\n${head}\n</head>\n${source}`
    );
  }
  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    head,
    '</head>',
    '<body>',
    source,
    '</body>',
    '</html>',
  ].join('\n');
}
