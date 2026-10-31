import { describe, expect, it } from 'vitest';
import { processIso20022 } from './iso20022';

const PAIN =
  '<?xml version="1.0"?><Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09"><CstmrCdtTrfInitn><GrpHdr><MsgId>ABC</MsgId><NbOfTxs>1</NbOfTxs></GrpHdr></CstmrCdtTrfInitn></Document>';

function output(input: string, mode: 'pretty' | 'minify' = 'pretty'): string {
  const result = processIso20022(input, mode);
  if (!result.ok) throw new Error(result.error.code);
  return result.output;
}

function failure(input: string) {
  const result = processIso20022(input, 'pretty');
  if (result.ok) throw new Error('expected an error');
  return result.error;
}

describe('pretty', () => {
  it('indents elements and keeps leaf text inline', () => {
    expect(output(PAIN)).toBe(
      [
        '<?xml version="1.0"?>',
        '<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09">',
        '  <CstmrCdtTrfInitn>',
        '    <GrpHdr>',
        '      <MsgId>ABC</MsgId>',
        '      <NbOfTxs>1</NbOfTxs>',
        '    </GrpHdr>',
        '  </CstmrCdtTrfInitn>',
        '</Document>',
      ].join('\n'),
    );
  });

  it('collapses empty elements and normalizes attributes', () => {
    expect(output('<a  x = "1"   y=\'2\'></a>')).toBe('<a x="1" y=\'2\'/>');
  });

  it('keeps mixed content and CDATA untouched', () => {
    expect(output('<a>x <b>y</b> z</a>')).toBe('<a>x <b>y</b> z</a>');
    expect(output('<a><![CDATA[ <raw> & ]]></a>')).toBe('<a><![CDATA[ <raw> & ]]></a>');
  });

  it('keeps comments', () => {
    expect(output('<a><!-- note --><b/></a>')).toBe('<a>\n  <!-- note -->\n  <b/>\n</a>');
  });

  it('supports other indents', () => {
    const result = processIso20022('<a><b/></a>', 'pretty', 4);
    expect(result).toMatchObject({ output: '<a>\n    <b/>\n</a>' });
  });
});

describe('minify', () => {
  it('removes layout whitespace and comments', () => {
    expect(output('<a>\n  <!-- x -->\n  <b>  1 </b>\n  <c/>\n</a>', 'minify')).toBe(
      '<a><b>  1 </b><c/></a>',
    );
  });

  it('round trips with pretty', () => {
    expect(output(output(PAIN), 'minify')).toBe(PAIN);
  });
});

describe('message type', () => {
  it.each([
    ['pain.001.001.09', 'pain.001'],
    ['pacs.008.001.10', 'pacs.008'],
    ['camt.053.001.08', 'camt.053'],
  ])('reads %s from the namespace', (id, family) => {
    const xml = `<Document xmlns="urn:iso:std:iso:20022:tech:xsd:${id}"><X/></Document>`;
    expect(processIso20022(xml, 'pretty')).toMatchObject({ message: { id, family } });
  });

  it('prefers the document over the application header', () => {
    const xml =
      '<Envelope><AppHdr xmlns="urn:iso:std:iso:20022:tech:xsd:head.001.001.02"/><Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"/></Envelope>';
    expect(processIso20022(xml, 'pretty')).toMatchObject({ message: { family: 'pacs.008' } });
  });

  it('falls back to the root element name, with prefixes', () => {
    expect(
      processIso20022('<x:Document xmlns:x="u"><x:BkToCstmrStmt/></x:Document>', 'pretty'),
    ).toMatchObject({
      message: { family: 'camt.053' },
    });
  });

  it('returns null for other XML', () => {
    expect(processIso20022('<a/>', 'pretty')).toMatchObject({ message: null });
  });
});

describe('well-formedness errors', () => {
  it.each([
    ['<a><b></a>', 'mismatch', 1, 7],
    ['<a>\n  <b>\n</c></b></a>', 'mismatch', 3, 1],
    ['<a>', 'unclosed', 1, 1],
    ['</a>', 'unexpectedClose', 1, 1],
    ['<a/><b/>', 'multipleRoots', 1, 5],
    ['x<a/>', 'textOutsideRoot', 1, 1],
    ['<a/>x', 'textOutsideRoot', 1, 5],
    ['<!-- only -->', 'noRoot', 1, 14],
    ['<a b=1/>', 'badAttribute', 1, 4],
    ['<a b="1" b="2"/>', 'duplicateAttribute', 1, 10],
    ['<a b="1"c="2"/>', 'badAttribute', 1, 9],
    ['<a b="<"/>', 'badAttribute', 1, 4],
    ['<a>&</a>', 'badEntity', 1, 4],
    ['<a>&nbsp;</a>', 'badEntity', 1, 4],
    ['<a><!-- x</a>', 'unterminated', 1, 4],
    ['<a><![CDATA[x</a>', 'unterminated', 1, 4],
    ['<a', 'unterminated', 1, 1],
    ['<1a/>', 'invalidName', 1, 1],
    ['<![CDATA[x]]><a/>', 'cdataOutsideRoot', 1, 1],
  ])('%s', (input, code, line, column) => {
    expect(failure(input)).toMatchObject({ code, line, column });
  });

  it('names the expected tag', () => {
    expect(failure('<Doc><Grp></Doc>')).toMatchObject({ name: 'Doc', expected: 'Grp' });
  });

  it('accepts valid entities', () => {
    expect(output('<a t="&quot;">&amp;&#65;&#x41;</a>')).toBe('<a t="&quot;">&amp;&#65;&#x41;</a>');
  });

  it('ignores a BOM without touching the text', () => {
    const bom = String.fromCharCode(0xfeff);
    expect(output(`${bom}<a/>`)).toBe('<a/>');
    expect(failure(`${bom}<a>`)).toMatchObject({ line: 1, column: 1 });
    expect(failure('FEFF<a/>')).toMatchObject({ code: 'textOutsideRoot' });
  });
});
