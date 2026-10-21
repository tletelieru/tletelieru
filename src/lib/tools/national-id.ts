import {
  formatArDni,
  formatCuit,
  generateArDni,
  generateCuit,
  validateArDni,
  validateCuit,
} from './ids/argentina';
import {
  formatCoCc,
  formatNit,
  generateCoCc,
  generateNit,
  validateCoCc,
  validateNit,
} from './ids/colombia';
import { formatEcCedula, generateEcCedula, validateEcCedula } from './ids/ecuador';
import {
  formatCurp,
  formatRfc,
  generateCurp,
  generateRfc,
  validateCurp,
  validateRfc,
} from './ids/mexico';
import {
  formatPeDni,
  formatRuc,
  generatePeDni,
  generateRuc,
  validatePeDni,
  validateRuc,
} from './ids/peru';
import type { Localized } from '../../i18n/locales';
import type { FormatStyle, IdValidation, Random } from './ids/shared';
import {
  formatEsDni,
  formatNie,
  formatNif,
  generateEsDni,
  generateNie,
  generateNif,
  validateEsDni,
  validateNie,
  validateNif,
} from './ids/spain';
import { formatUyCi, generateUyCi, validateUyCi } from './ids/uruguay';

export const countries = [
  { id: 'ar', label: { en: 'Argentina', es: 'Argentina' } },
  { id: 'pe', label: { en: 'Peru', es: 'Perú' } },
  { id: 'co', label: { en: 'Colombia', es: 'Colombia' } },
  { id: 'mx', label: { en: 'Mexico', es: 'México' } },
  { id: 'uy', label: { en: 'Uruguay', es: 'Uruguay' } },
  { id: 'es', label: { en: 'Spain', es: 'España' } },
  { id: 'ec', label: { en: 'Ecuador', es: 'Ecuador' } },
] as const satisfies readonly { id: string; label: Localized }[];

export type CountryId = (typeof countries)[number]['id'];

export interface IdDocument {
  id: string;
  country: CountryId;
  label: Localized;
  name: Localized;
  checkDigit: boolean;
  placeholder: string;
  validate: (input: string) => IdValidation;
  styles: readonly FormatStyle[];
  format: (input: string, style: FormatStyle) => string | null;
  generate: (random?: Random) => string;
}

export const documents: IdDocument[] = [
  {
    id: 'ar-dni',
    country: 'ar',
    label: { en: 'DNI', es: 'DNI' },
    name: { en: 'Documento Nacional de Identidad', es: 'Documento Nacional de Identidad' },
    checkDigit: false,
    placeholder: '12.345.678\n1234567',
    styles: ['full', 'plain'],
    validate: validateArDni,
    format: formatArDni,
    generate: generateArDni,
  },
  {
    id: 'ar-cuit',
    country: 'ar',
    label: { en: 'CUIT / CUIL', es: 'CUIT / CUIL' },
    name: {
      en: 'Clave Única de Identificación Tributaria / Laboral',
      es: 'Clave Única de Identificación Tributaria / Laboral',
    },
    checkDigit: true,
    placeholder: '20-12345678-6\n33693450239',
    styles: ['full', 'plain'],
    validate: validateCuit,
    format: formatCuit,
    generate: generateCuit,
  },
  {
    id: 'pe-dni',
    country: 'pe',
    label: { en: 'DNI', es: 'DNI' },
    name: { en: 'Documento Nacional de Identidad', es: 'Documento Nacional de Identidad' },
    checkDigit: true,
    placeholder: '12345678\n12345678-1',
    styles: ['full', 'plain'],
    validate: validatePeDni,
    format: formatPeDni,
    generate: generatePeDni,
  },
  {
    id: 'pe-ruc',
    country: 'pe',
    label: { en: 'RUC', es: 'RUC' },
    name: { en: 'Registro Único de Contribuyentes', es: 'Registro Único de Contribuyentes' },
    checkDigit: true,
    placeholder: '20131312955\n10123456781',
    styles: ['plain'],
    validate: validateRuc,
    format: formatRuc,
    generate: generateRuc,
  },
  {
    id: 'co-cc',
    country: 'co',
    label: { en: 'CC', es: 'CC' },
    name: { en: 'Cédula de Ciudadanía', es: 'Cédula de Ciudadanía' },
    checkDigit: false,
    placeholder: '1.020.304.050\n79123456',
    styles: ['full', 'plain'],
    validate: validateCoCc,
    format: formatCoCc,
    generate: generateCoCc,
  },
  {
    id: 'co-nit',
    country: 'co',
    label: { en: 'NIT', es: 'NIT' },
    name: { en: 'Número de Identificación Tributaria', es: 'Número de Identificación Tributaria' },
    checkDigit: true,
    placeholder: '800.197.268-4\n8001972684',
    styles: ['full', 'dash', 'plain'],
    validate: validateNit,
    format: formatNit,
    generate: generateNit,
  },
  {
    id: 'mx-curp',
    country: 'mx',
    label: { en: 'CURP', es: 'CURP' },
    name: {
      en: 'Clave Única de Registro de Población',
      es: 'Clave Única de Registro de Población',
    },
    checkDigit: true,
    placeholder: 'BOXW310820HNERXN09',
    styles: ['plain'],
    validate: validateCurp,
    format: formatCurp,
    generate: generateCurp,
  },
  {
    id: 'mx-rfc',
    country: 'mx',
    label: { en: 'RFC', es: 'RFC' },
    name: { en: 'Registro Federal de Contribuyentes', es: 'Registro Federal de Contribuyentes' },
    checkDigit: true,
    placeholder: 'GODE561231GR8',
    styles: ['plain'],
    validate: validateRfc,
    format: formatRfc,
    generate: generateRfc,
  },
  {
    id: 'uy-ci',
    country: 'uy',
    label: { en: 'CI', es: 'CI' },
    name: { en: 'Cédula de Identidad', es: 'Cédula de Identidad' },
    checkDigit: true,
    placeholder: '1.234.567-2\n12345672',
    styles: ['full', 'dash', 'plain'],
    validate: validateUyCi,
    format: formatUyCi,
    generate: generateUyCi,
  },
  {
    id: 'es-dni',
    country: 'es',
    label: { en: 'DNI', es: 'DNI' },
    name: { en: 'Documento Nacional de Identidad', es: 'Documento Nacional de Identidad' },
    checkDigit: true,
    placeholder: '12345678Z\n12345678-Z',
    styles: ['full', 'plain'],
    validate: validateEsDni,
    format: formatEsDni,
    generate: generateEsDni,
  },
  {
    id: 'es-nie',
    country: 'es',
    label: { en: 'NIE', es: 'NIE' },
    name: { en: 'Número de Identidad de Extranjero', es: 'Número de Identidad de Extranjero' },
    checkDigit: true,
    placeholder: 'X1234567L\nY-0000000-Z',
    styles: ['full', 'plain'],
    validate: validateNie,
    format: formatNie,
    generate: generateNie,
  },
  {
    id: 'es-nif',
    country: 'es',
    label: { en: 'NIF', es: 'NIF' },
    name: {
      en: 'Número de Identificación Fiscal (persons: DNI or NIE)',
      es: 'Número de Identificación Fiscal (personas: DNI o NIE)',
    },
    checkDigit: true,
    placeholder: '12345678Z\nX1234567L',
    styles: ['full', 'plain'],
    validate: validateNif,
    format: formatNif,
    generate: generateNif,
  },
  {
    id: 'ec-cedula',
    country: 'ec',
    label: { en: 'Cédula', es: 'Cédula' },
    name: { en: 'Cédula de Identidad', es: 'Cédula de Identidad' },
    checkDigit: true,
    placeholder: '1710034065\n171003406-5',
    styles: ['full', 'plain'],
    validate: validateEcCedula,
    format: formatEcCedula,
    generate: generateEcCedula,
  },
];

export function isCountryId(value: string): value is CountryId {
  return countries.some((country) => country.id === value);
}

export function documentsOf(country: CountryId): IdDocument[] {
  return documents.filter((document) => document.country === country);
}

export function resolveDocument(country: string, documentId: string): IdDocument {
  const countryId = isCountryId(country) ? country : 'ar';
  const options = documentsOf(countryId);
  return options.find((document) => document.id === documentId) ?? options[0];
}

export function generateDocuments(
  document: IdDocument,
  count: number,
  random: Random = Math.random,
): string[] {
  return Array.from({ length: count }, () => document.generate(random));
}
