import { describe, expect, it } from 'vitest';
import { buildCsp, buildSrcDoc, isFullDocument, sandboxFor, viewportWidth } from './html';

const CSP_META = /<meta http-equiv="Content-Security-Policy" content="([^"]*)">/;

describe('isFullDocument', () => {
  it.each([
    '<!DOCTYPE html><html><body></body></html>',
    '  <!doctype html>\n<p>hi</p>',
    '<html lang="en"></html>',
    '<!-- note -->\n<html>',
    '\uFEFF<head><title>x</title></head>',
    '<body class="x">hi</body>',
  ])('detects %j as a document', (html) => {
    expect(isFullDocument(html)).toBe(true);
  });

  it.each(['<p>hi</p>', '<header>top</header>', 'plain text', '<div><html></div>'])(
    'detects %j as a fragment',
    (html) => {
      expect(isFullDocument(html)).toBe(false);
    },
  );
});

describe('buildCsp', () => {
  it('blocks every network request and scripts by default', () => {
    const csp = buildCsp(false);
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain('img-src data: blob:');
    expect(csp).toContain("style-src 'unsafe-inline'");
    expect(csp).not.toContain('script-src');
    expect(csp).not.toMatch(/https?:|\*/);
  });

  it('allows inline scripts only when requested', () => {
    expect(buildCsp(true)).toContain("script-src 'unsafe-inline'");
  });
});

describe('sandboxFor', () => {
  it('never grants same-origin', () => {
    expect(sandboxFor(false)).toBe('');
    expect(sandboxFor(true)).toBe('allow-scripts');
  });
});

describe('viewportWidth', () => {
  it.each([
    ['mobile', '375px'],
    ['tablet', '768px'],
    ['desktop', '100%'],
  ] as const)('maps %s to %s', (viewport, width) => {
    expect(viewportWidth(viewport)).toBe(width);
  });
});

describe('buildSrcDoc', () => {
  it('wraps fragments in a full document', () => {
    const doc = buildSrcDoc('<p>Hello</p>');
    expect(doc.startsWith('<!doctype html>\n<html>\n<head>\n<meta charset="utf-8">')).toBe(true);
    expect(doc).toContain('<body>\n<p>Hello</p>\n</body>\n</html>');
    expect(doc.match(CSP_META)?.[1]).toBe(buildCsp(false));
  });

  it('sets the background style', () => {
    expect(buildSrcDoc('x', { background: 'dark' })).toContain('background: #121212');
    expect(buildSrcDoc('x')).toContain('color-scheme: light');
  });

  it('adds script-src when scripts are allowed', () => {
    const doc = buildSrcDoc('<script>1</script>', { allowScripts: true });
    expect(doc.match(CSP_META)?.[1]).toContain("script-src 'unsafe-inline'");
  });

  it('injects the head right after an existing <head>', () => {
    const doc = buildSrcDoc(
      '<!doctype html><html><head><link rel="stylesheet" href="https://x"></head></html>',
    );
    const head = doc.indexOf('<head>');
    expect(doc.indexOf('Content-Security-Policy')).toBeGreaterThan(head);
    expect(doc.indexOf('Content-Security-Policy')).toBeLessThan(doc.indexOf('<link'));
    expect(doc.match(/<html>/g)).toHaveLength(1);
  });

  it('creates a head after <html> when missing', () => {
    const doc = buildSrcDoc('<html lang="es"><body>hola</body></html>');
    expect(doc).toMatch(/^<html lang="es">\n<head>\n<meta charset="utf-8">/);
  });

  it('creates a head after the doctype when there is no html tag', () => {
    const doc = buildSrcDoc('<!DOCTYPE html>\n<p>x</p>');
    expect(doc).toMatch(/^<!DOCTYPE html>\n<head>\n<meta charset/);
  });

  it('prepends a head to a bare body document', () => {
    expect(buildSrcDoc('<body>x</body>')).toMatch(/^<head>\n<meta charset[\s\S]*<\/head>\n<body>x/);
  });

  it('strips a leading BOM', () => {
    expect(buildSrcDoc('\uFEFF<p>x</p>')).not.toContain('\uFEFF');
  });
});
