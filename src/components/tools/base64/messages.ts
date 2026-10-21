import { defineMessages } from '~/i18n/react';

export const base64Messages = defineMessages({
  en: {
    mode: 'Mode',
    encode: 'Encode',
    decode: 'Decode',
    file: 'File',
    alphabet: 'Alphabet',
    alphabetName: { standard: 'Standard', url: 'URL-safe' },
    padding: 'Padding',
    wrap: 'Wrap at 76 (MIME)',
    encodeLabel: 'Text to encode',
    decodeLabel: 'Base64 or data URI to decode',
    pickFile: 'Choose file',
    noFile: 'No file selected',
    fileOutput: 'File output',
    fileOutputName: { base64: 'Base64', dataUri: 'Data URI' },
    download: 'Download file',
    sizes: (input: string, output: string) => `${input} → ${output}`,
    fileInfo: (name: string, type: string, size: string) => `${name} · ${type} · ${size}`,
    errors: {
      invalidChar: (position: number, char: string) =>
        `Invalid character "${char}" at position ${position + 1}.`,
      length: 'The Base64 data has an impossible length (one character too many or too few).',
      utf8: 'The decoded bytes are not valid UTF-8 text. Use "Download file" to save them.',
    },
  },
  es: {
    mode: 'Modo',
    encode: 'Codificar',
    decode: 'Decodificar',
    file: 'Archivo',
    alphabet: 'Alfabeto',
    alphabetName: { standard: 'Estándar', url: 'Seguro para URL' },
    padding: 'Relleno',
    wrap: 'Cortar a 76 (MIME)',
    encodeLabel: 'Texto a codificar',
    decodeLabel: 'Base64 o data URI a decodificar',
    pickFile: 'Elegir archivo',
    noFile: 'Ningún archivo seleccionado',
    fileOutput: 'Salida del archivo',
    fileOutputName: { base64: 'Base64', dataUri: 'Data URI' },
    download: 'Descargar archivo',
    sizes: (input: string, output: string) => `${input} → ${output}`,
    fileInfo: (name: string, type: string, size: string) => `${name} · ${type} · ${size}`,
    errors: {
      invalidChar: (position: number, char: string) =>
        `Carácter inválido "${char}" en la posición ${position + 1}.`,
      length: 'Los datos Base64 tienen un largo imposible (sobra o falta un carácter).',
      utf8: 'Los bytes decodificados no son texto UTF-8 válido. Usa "Descargar archivo" para guardarlos.',
    },
  },
});
