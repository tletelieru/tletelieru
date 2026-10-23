import { defineMessages } from '~/i18n/react';
import type { ByteParseError, NumberBaseError } from '~/lib/tools/number-base';

export const numberBaseMessages = defineMessages({
  en: {
    mode: 'Mode',
    bases: 'Number bases',
    bytes: 'Byte sizes',
    inputBase: 'Input base',
    auto: 'Auto (0x, 0b, 0o)',
    width: "Two's complement width",
    bits: (bits: string) => `${bits}-bit`,
    number: 'Number',
    size: 'Size (e.g. 1.5 GiB)',
    twos: (width: number) => `two's complement (${width}-bit)`,
    signed: 'signed',
    unsigned: 'unsigned',
    doesNotFit: (width: number) => `does not fit in ${width} bits`,
    numberError: (error: NumberBaseError): string =>
      error.code === 'empty'
        ? 'Enter a number.'
        : `'${error.char}' is not a valid base-${error.base} digit.`,
    bytesError: (error: ByteParseError): string =>
      error.code === 'empty'
        ? 'Enter a size.'
        : `Could not read "${error.input}". Use a number and a unit such as B, KB, MB, KiB or MiB.`,
  },
  es: {
    mode: 'Modo',
    bases: 'Bases numéricas',
    bytes: 'Tamaños en bytes',
    inputBase: 'Base de entrada',
    auto: 'Automática (0x, 0b, 0o)',
    width: 'Ancho del complemento a dos',
    bits: (bits: string) => `${bits} bits`,
    number: 'Número',
    size: 'Tamaño (por ejemplo 1.5 GiB)',
    twos: (width: number) => `complemento a dos (${width} bits)`,
    signed: 'con signo',
    unsigned: 'sin signo',
    doesNotFit: (width: number) => `no cabe en ${width} bits`,
    numberError: (error: NumberBaseError): string =>
      error.code === 'empty'
        ? 'Escribe un número.'
        : `'${error.char}' no es un dígito válido en base ${error.base}.`,
    bytesError: (error: ByteParseError): string =>
      error.code === 'empty'
        ? 'Escribe un tamaño.'
        : `No se pudo leer "${error.input}". Usa un número y una unidad como B, KB, MB, KiB o MiB.`,
  },
});
