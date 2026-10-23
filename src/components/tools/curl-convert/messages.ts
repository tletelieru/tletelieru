import { defineMessages } from '~/i18n/react';
import type { CurlError } from '~/lib/tools/curl';

export const curlMessages = defineMessages({
  en: {
    input: 'cURL command',
    target: 'Language',
    privacy:
      'The command stays in this tab: it is not saved in the URL, history or snippets, and nothing is executed.',
    ignored: (flags: string[]) => `Ignored options: ${flags.join(', ')}`,
    insecure:
      '-k / --insecure: certificate checks are only disabled in the Node and Python output.',
    error: (error: CurlError): string => {
      switch (error.code) {
        case 'empty':
          return 'Paste a cURL command.';
        case 'notCurl':
          return 'The command must start with curl.';
        case 'unterminatedQuote':
          return `Unterminated ${error.quote} quote.`;
        case 'missingValue':
          return `${error.flag} needs a value.`;
        case 'missingUrl':
          return 'No URL found in the command.';
        case 'invalidUrl':
          return `Invalid URL: ${error.url}`;
      }
    },
  },
  es: {
    input: 'Comando cURL',
    target: 'Lenguaje',
    privacy:
      'El comando se queda en esta pestaña: no se guarda en la URL, el historial ni los snippets, y no se ejecuta nada.',
    ignored: (flags: string[]) => `Opciones ignoradas: ${flags.join(', ')}`,
    insecure:
      '-k / --insecure: la verificación de certificados solo se desactiva en la salida de Node y Python.',
    error: (error: CurlError): string => {
      switch (error.code) {
        case 'empty':
          return 'Pega un comando cURL.';
        case 'notCurl':
          return 'El comando debe empezar con curl.';
        case 'unterminatedQuote':
          return `Comilla ${error.quote} sin cerrar.`;
        case 'missingValue':
          return `${error.flag} necesita un valor.`;
        case 'missingUrl':
          return 'No se encontró una URL en el comando.';
        case 'invalidUrl':
          return `URL inválida: ${error.url}`;
      }
    },
  },
});
