import { defineMessages } from '~/i18n/react';
import type { XmlError } from '~/lib/tools/iso20022';

export const iso20022Messages = defineMessages({
  en: {
    input: 'ISO 20022 XML',
    mode: 'Mode',
    modes: { pretty: 'Pretty', minify: 'Minify' },
    indent: 'Indent',
    indents: { '2': '2 spaces', '4': '4 spaces' },
    message: (id: string, name: string) => (name ? `${id} · ${name}` : id),
    unknownMessage: 'Message type not detected',
    families: {
      'pain.001': 'Customer credit transfer initiation',
      'pain.002': 'Customer payment status report',
      'pain.008': 'Customer direct debit initiation',
      'pacs.002': 'FI to FI payment status report',
      'pacs.004': 'Payment return',
      'pacs.008': 'FI to FI customer credit transfer',
      'pacs.009': 'Financial institution credit transfer',
      'pacs.028': 'FI to FI payment status request',
      'camt.029': 'Resolution of investigation',
      'camt.052': 'Bank to customer account report',
      'camt.053': 'Bank to customer statement',
      'camt.054': 'Bank to customer debit/credit notification',
      'camt.056': 'FI to FI payment cancellation request',
      'head.001': 'Business application header',
    } as Record<string, string>,
    error: ({ code, line, column, name, expected }: XmlError): string => {
      const where = `Line ${line}, column ${column}`;
      switch (code) {
        case 'noRoot':
          return `${where}: the document has no root element`;
        case 'multipleRoots':
          return `${where}: a second root element <${name}> is not allowed`;
        case 'textOutsideRoot':
          return `${where}: text outside the root element`;
        case 'unclosed':
          return `${where}: <${name}> is never closed`;
        case 'mismatch':
          return `${where}: </${name}> closes <${expected}>`;
        case 'unexpectedClose':
          return `${where}: </${name}> has no opening tag`;
        case 'invalidName':
          return `${where}: invalid element name`;
        case 'badAttribute':
          return `${where}: malformed attribute${name ? ` ${name}` : ''}`;
        case 'duplicateAttribute':
          return `${where}: attribute ${name} is repeated`;
        case 'unterminated':
          return `${where}: this construct is never closed`;
        case 'badEntity':
          return `${where}: invalid entity; escape & as &amp;`;
        case 'cdataOutsideRoot':
          return `${where}: CDATA outside the root element`;
      }
    },
  },
  es: {
    input: 'XML ISO 20022',
    mode: 'Modo',
    modes: { pretty: 'Formatear', minify: 'Minificar' },
    indent: 'Sangría',
    indents: { '2': '2 espacios', '4': '4 espacios' },
    message: (id: string, name: string) => (name ? `${id} · ${name}` : id),
    unknownMessage: 'Tipo de mensaje no detectado',
    families: {
      'pain.001': 'Inicio de transferencia del cliente',
      'pain.002': 'Informe de estado de pago al cliente',
      'pain.008': 'Inicio de débito directo del cliente',
      'pacs.002': 'Informe de estado de pago entre instituciones',
      'pacs.004': 'Devolución de pago',
      'pacs.008': 'Transferencia de cliente entre instituciones',
      'pacs.009': 'Transferencia entre instituciones financieras',
      'pacs.028': 'Solicitud de estado de pago entre instituciones',
      'camt.029': 'Resolución de investigación',
      'camt.052': 'Informe de cuenta del banco al cliente',
      'camt.053': 'Cartola del banco al cliente',
      'camt.054': 'Aviso de débito o crédito al cliente',
      'camt.056': 'Solicitud de cancelación de pago entre instituciones',
      'head.001': 'Encabezado de aplicación de negocio',
    } as Record<string, string>,
    error: ({ code, line, column, name, expected }: XmlError): string => {
      const where = `Línea ${line}, columna ${column}`;
      switch (code) {
        case 'noRoot':
          return `${where}: el documento no tiene elemento raíz`;
        case 'multipleRoots':
          return `${where}: no se permite un segundo elemento raíz <${name}>`;
        case 'textOutsideRoot':
          return `${where}: hay texto fuera del elemento raíz`;
        case 'unclosed':
          return `${where}: <${name}> nunca se cierra`;
        case 'mismatch':
          return `${where}: </${name}> cierra <${expected}>`;
        case 'unexpectedClose':
          return `${where}: </${name}> no tiene etiqueta de apertura`;
        case 'invalidName':
          return `${where}: nombre de elemento inválido`;
        case 'badAttribute':
          return `${where}: atributo mal formado${name ? ` ${name}` : ''}`;
        case 'duplicateAttribute':
          return `${where}: el atributo ${name} está repetido`;
        case 'unterminated':
          return `${where}: esta construcción nunca se cierra`;
        case 'badEntity':
          return `${where}: entidad inválida; escapa & como &amp;`;
        case 'cdataOutsideRoot':
          return `${where}: CDATA fuera del elemento raíz`;
      }
    },
  },
});
