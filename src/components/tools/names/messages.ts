import type { NameFormat, SplitStrategy, SurnameConvention } from '@tletelieru/name-formatter';
import { defineMessages } from '~/i18n/react';
import type { ApostropheId, EnyeId, HyphenId, PresetId, SplitPartId } from '~/lib/tools/names';

export const namesMessages = defineMessages<{
  format: string;
  strategy: string;
  convention: string;
  preset: string;
  enye: string;
  apostrophe: string;
  hyphen: string;
  removeAccents: string;
  inputLabel: string;
  allFormats: string;
  parts: string;
  output: (formatName: string) => string;
  formats: Record<NameFormat, string>;
  strategies: Record<Exclude<SplitStrategy, 'surnameCount'>, string>;
  conventions: Record<SurnameConvention, string>;
  presets: Record<PresetId, string>;
  enyeRules: Record<EnyeId, string>;
  apostropheRules: Record<ApostropheId, string>;
  hyphenRules: Record<HyphenId, string>;
  partLabels: Record<SplitPartId, string>;
}>({
  en: {
    format: 'Format',
    strategy: 'Split strategy',
    convention: 'Surname convention',
    preset: 'Normalize',
    enye: 'Ñ',
    apostrophe: 'Apostrophe',
    hyphen: 'Hyphen',
    removeAccents: 'Remove accents',
    inputLabel: 'Names, one per line',
    allFormats: 'All formats',
    parts: 'Name parts',
    output: (formatName: string) => `Output (${formatName})`,
    formats: {
      upper: 'UPPER CASE',
      lower: 'lower case',
      capitalize: 'Capitalize Every Word',
      capitalizeName: 'Name case',
    },
    strategies: {
      dictionary: 'Dictionary',
      particle: 'Particles',
      lastTwo: 'Last two words',
    },
    conventions: {
      double: 'Two surnames',
      single: 'One surname',
    },
    presets: {
      none: 'None',
      ascii: 'ASCII',
      email: 'Email',
      strict: 'Letters only',
    },
    enyeRules: {
      auto: 'Preset default',
      keep: 'Keep ñ',
      n: 'ñ → n',
      ni: 'ñ → ni',
      nh: 'ñ → nh',
      ny: 'ñ → ny',
    },
    apostropheRules: {
      auto: 'Preset default',
      keep: "Keep '",
      remove: 'Remove',
      space: 'Space',
    },
    hyphenRules: {
      auto: 'Preset default',
      keep: 'Keep -',
      remove: 'Remove',
      space: 'Space',
    },
    partLabels: {
      givenNames: 'Given names',
      surnames: 'Surnames',
      firstName: 'First name',
      middleName: 'Middle name',
      firstSurname: 'First surname',
      secondSurname: 'Second surname',
    },
  },
  es: {
    format: 'Formato',
    strategy: 'Estrategia de separación',
    convention: 'Convención de apellidos',
    preset: 'Normalizar',
    enye: 'Ñ',
    apostrophe: 'Apóstrofo',
    hyphen: 'Guion',
    removeAccents: 'Quitar tildes',
    inputLabel: 'Nombres, uno por línea',
    allFormats: 'Todos los formatos',
    parts: 'Partes del nombre',
    output: (formatName: string) => `Resultado (${formatName})`,
    formats: {
      upper: 'MAYÚSCULAS',
      lower: 'minúsculas',
      capitalize: 'Cada Palabra Con Mayúscula',
      capitalizeName: 'Nombre propio',
    },
    strategies: {
      dictionary: 'Diccionario',
      particle: 'Partículas',
      lastTwo: 'Últimas dos palabras',
    },
    conventions: {
      double: 'Dos apellidos',
      single: 'Un apellido',
    },
    presets: {
      none: 'Ninguno',
      ascii: 'ASCII',
      email: 'Email',
      strict: 'Solo letras',
    },
    enyeRules: {
      auto: 'Según el preset',
      keep: 'Mantener ñ',
      n: 'ñ → n',
      ni: 'ñ → ni',
      nh: 'ñ → nh',
      ny: 'ñ → ny',
    },
    apostropheRules: {
      auto: 'Según el preset',
      keep: "Mantener '",
      remove: 'Quitar',
      space: 'Espacio',
    },
    hyphenRules: {
      auto: 'Según el preset',
      keep: 'Mantener -',
      remove: 'Quitar',
      space: 'Espacio',
    },
    partLabels: {
      givenNames: 'Nombres',
      surnames: 'Apellidos',
      firstName: 'Primer nombre',
      middleName: 'Segundo nombre',
      firstSurname: 'Primer apellido',
      secondSurname: 'Segundo apellido',
    },
  },
});
