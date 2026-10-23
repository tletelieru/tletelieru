import { defineMessages } from '~/i18n/react';
import type { YamlError } from '~/lib/tools/yaml-json';

const reasonsEs: Record<string, string> = {
  BAD_INDENT: 'Indentación incorrecta',
  BAD_DQ_ESCAPE: 'Secuencia de escape inválida en un string con comillas dobles',
  BAD_SCALAR_START: 'Un valor no puede empezar con este carácter',
  BLOCK_AS_IMPLICIT_KEY: 'No se permiten mapas anidados en un mapa compacto',
  BLOCK_IN_FLOW: 'No se permite un bloque dentro de una colección en línea',
  DUPLICATE_KEY: 'Las claves de un mapa deben ser únicas',
  MISSING_CHAR: 'Falta un carácter de cierre',
  MULTILINE_IMPLICIT_KEY: 'Las claves implícitas deben estar en una sola línea',
  TAB_AS_INDENT: 'No se permiten tabuladores como indentación',
  UNEXPECTED_TOKEN: 'Token inesperado',
  BAD_ALIAS: 'Alias inválido',
  KEY_OVER_1024_CHARS: 'Las claves implícitas no pueden superar los 1024 caracteres',
};

function where(error: YamlError, line: string, column: string): string {
  return error.line === null ? '' : `${line} ${error.line}, ${column} ${error.column}: `;
}

export const yamlJsonMessages = defineMessages({
  en: {
    mode: 'Direction',
    yaml2json: 'YAML → JSON',
    json2yaml: 'JSON → YAML',
    indent: 'Indent',
    spaces: (count: number) => `${count} spaces`,
    documents: (count: number) => `${count} documents`,
    yamlError: (error: YamlError) => `${where(error, 'Line', 'column')}${error.message}`,
  },
  es: {
    mode: 'Dirección',
    yaml2json: 'YAML → JSON',
    json2yaml: 'JSON → YAML',
    indent: 'Indentación',
    spaces: (count: number) => `${count} espacios`,
    documents: (count: number) => `${count} documentos`,
    yamlError: (error: YamlError) =>
      `${where(error, 'Línea', 'columna')}${reasonsEs[error.code] ?? error.message}`,
  },
});
