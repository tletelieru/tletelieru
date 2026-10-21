import { defineMessages } from '~/i18n/react';
import type { HtmlEntityIssueCode } from '~/lib/tools/html-entities';

export const htmlEntitiesMessages = defineMessages({
  en: {
    mode: 'Mode',
    encode: 'Encode',
    decode: 'Decode',
    scope: 'Characters',
    scopes: {
      minimal: 'Only & < > " \'',
      'non-ascii': 'Also non-ASCII',
    },
    format: 'Entity format',
    formats: {
      named: 'Named',
      decimal: 'Decimal',
      hex: 'Hex',
    },
    encodeInput: 'Text to encode',
    decodeInput: 'Text with HTML entities',
    decodedCount: (count: number) => `${count} ${count === 1 ? 'entity' : 'entities'} decoded`,
    issuesTitle: (count: number) => `${count} ${count === 1 ? 'warning' : 'warnings'}`,
    issue: (code: HtmlEntityIssueCode, entity: string, line: number, column: number) => {
      const where = `line ${line}, column ${column}`;
      if (code === 'unknown-entity') return `${entity}: unknown entity, kept as is (${where})`;
      if (code === 'missing-semicolon') return `${entity}: missing “;” (${where})`;
      return `${entity}: invalid code point, replaced with U+FFFD (${where})`;
    },
  },
  es: {
    mode: 'Modo',
    encode: 'Codificar',
    decode: 'Decodificar',
    scope: 'Caracteres',
    scopes: {
      minimal: 'Solo & < > " \'',
      'non-ascii': 'También no ASCII',
    },
    format: 'Formato de entidad',
    formats: {
      named: 'Con nombre',
      decimal: 'Decimal',
      hex: 'Hexadecimal',
    },
    encodeInput: 'Texto a codificar',
    decodeInput: 'Texto con entidades HTML',
    decodedCount: (count: number) =>
      `${count} ${count === 1 ? 'entidad decodificada' : 'entidades decodificadas'}`,
    issuesTitle: (count: number) => `${count} ${count === 1 ? 'advertencia' : 'advertencias'}`,
    issue: (code: HtmlEntityIssueCode, entity: string, line: number, column: number) => {
      const where = `línea ${line}, columna ${column}`;
      if (code === 'unknown-entity') {
        return `${entity}: entidad desconocida, se mantiene igual (${where})`;
      }
      if (code === 'missing-semicolon') return `${entity}: falta el “;” (${where})`;
      return `${entity}: punto de código inválido, se reemplaza por U+FFFD (${where})`;
    },
  },
});
