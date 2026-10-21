import { defineMessages } from '~/i18n/react';

export const urlMessages = defineMessages({
  en: {
    mode: 'Mode',
    modeName: { encode: 'Encode', decode: 'Decode', parse: 'Parse', build: 'Build' },
    scope: 'Scope',
    scopeName: { component: 'Component', uri: 'Full URI' },
    form: 'Form encoding (+ for spaces)',
    inputLabel: {
      encode: 'Text to encode',
      decode: 'Text to decode',
      parse: 'URL or query string',
      build: 'URL or query string',
    },
    base: 'Base URL (optional)',
    key: 'Key',
    value: 'Value',
    raw: 'Raw',
    addRow: 'Add parameter',
    removeRow: (index: number) => `Remove parameter ${index + 1}`,
    parts: 'URL parts',
    params: 'Query parameters',
    noParams: 'No query parameters.',
    partName: {
      protocol: 'Protocol',
      username: 'User',
      password: 'Password',
      hostname: 'Host',
      port: 'Port',
      pathname: 'Path',
      search: 'Query',
      hash: 'Hash',
    },
    summary: (count: number) => `${count} parameter${count === 1 ? '' : 's'}`,
    invalidUrl: 'This does not look like a valid URL.',
    issues: {
      badEscape: (position: number) => `Invalid percent-escape at position ${position + 1}.`,
      badUtf8: (position: number) =>
        `The percent-escapes at position ${position + 1} are not valid UTF-8.`,
      loneSurrogate: (position: number) =>
        `Unpaired surrogate at position ${position + 1} cannot be encoded.`,
    },
    paramIssue: (key: string, message: string) => `${key}: ${message}`,
  },
  es: {
    mode: 'Modo',
    modeName: { encode: 'Codificar', decode: 'Decodificar', parse: 'Analizar', build: 'Construir' },
    scope: 'Alcance',
    scopeName: { component: 'Componente', uri: 'URI completa' },
    form: 'Codificación de formulario (+ para espacios)',
    inputLabel: {
      encode: 'Texto a codificar',
      decode: 'Texto a decodificar',
      parse: 'URL o query string',
      build: 'URL o query string',
    },
    base: 'URL base (opcional)',
    key: 'Clave',
    value: 'Valor',
    raw: 'Original',
    addRow: 'Agregar parámetro',
    removeRow: (index: number) => `Quitar parámetro ${index + 1}`,
    parts: 'Partes de la URL',
    params: 'Parámetros de la query',
    noParams: 'Sin parámetros en la query.',
    partName: {
      protocol: 'Protocolo',
      username: 'Usuario',
      password: 'Contraseña',
      hostname: 'Host',
      port: 'Puerto',
      pathname: 'Ruta',
      search: 'Query',
      hash: 'Hash',
    },
    summary: (count: number) => `${count} parámetro${count === 1 ? '' : 's'}`,
    invalidUrl: 'Esto no parece una URL válida.',
    issues: {
      badEscape: (position: number) =>
        `Secuencia de escape porcentual inválida en la posición ${position + 1}.`,
      badUtf8: (position: number) =>
        `Las secuencias de escape en la posición ${position + 1} no son UTF-8 válido.`,
      loneSurrogate: (position: number) =>
        `El surrogate sin pareja en la posición ${position + 1} no se puede codificar.`,
    },
    paramIssue: (key: string, message: string) => `${key}: ${message}`,
  },
});
