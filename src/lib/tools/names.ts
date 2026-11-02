import {
  formatName,
  splitName,
  type NameFormat,
  type NormalizeOptions,
  type SplitName,
  type SplitStrategy,
  type SurnameConvention,
} from '@tletelieru/name-formatter';
import { pickOption } from './sql/format';

export const nameFormats = ['upper', 'lower', 'capitalize', 'capitalizeName'] as const;
export const splitStrategies = ['dictionary', 'particle', 'lastTwo'] as const;
export const conventions = ['double', 'single'] as const;
export const presets = ['none', 'ascii', 'email', 'strict'] as const;
export const enyeRules = ['auto', 'keep', 'n', 'ni', 'nh', 'ny'] as const;
export const apostropheRules = ['auto', 'keep', 'remove', 'space'] as const;
export const hyphenRules = ['auto', 'keep', 'remove', 'space'] as const;
export const splitPartIds = [
  'givenNames',
  'surnames',
  'firstName',
  'middleName',
  'firstSurname',
  'secondSurname',
] as const satisfies readonly (keyof SplitName)[];

export type PresetId = (typeof presets)[number];
export type EnyeId = (typeof enyeRules)[number];
export type ApostropheId = (typeof apostropheRules)[number];
export type HyphenId = (typeof hyphenRules)[number];
export type SplitPartId = (typeof splitPartIds)[number];

export interface NameSettings {
  format: NameFormat;
  strategy: SplitStrategy;
  convention: SurnameConvention;
  preset: PresetId;
  enye: EnyeId;
  apostrophe: ApostropheId;
  hyphen: HyphenId;
  stripAccents: boolean;
}

export type NameSettingsInput = {
  format: string;
  strategy: string;
  convention: string;
  preset: string;
  enye: string;
  apostrophe: string;
  hyphen: string;
  stripAccents: boolean;
};

export const defaultNameSettings: NameSettings = {
  format: 'capitalizeName',
  strategy: 'dictionary',
  convention: 'double',
  preset: 'none',
  enye: 'auto',
  apostrophe: 'auto',
  hyphen: 'auto',
  stripAccents: false,
};

export function resolveNameSettings(input: NameSettingsInput): NameSettings {
  const fallback = defaultNameSettings;
  return {
    format: pickOption(input.format, nameFormats, fallback.format),
    strategy: pickOption(input.strategy, splitStrategies, fallback.strategy),
    convention: pickOption(input.convention, conventions, fallback.convention),
    preset: pickOption(input.preset, presets, fallback.preset),
    enye: pickOption(input.enye, enyeRules, fallback.enye),
    apostrophe: pickOption(input.apostrophe, apostropheRules, fallback.apostrophe),
    hyphen: pickOption(input.hyphen, hyphenRules, fallback.hyphen),
    stripAccents: input.stripAccents,
  };
}

export function presetStripsAccents(preset: PresetId): boolean {
  return preset === 'ascii' || preset === 'email';
}

export function buildNormalizeOptions(settings: NameSettings): NormalizeOptions | undefined {
  const options: NormalizeOptions = {
    ...(settings.preset !== 'none' && { preset: settings.preset }),
    ...(settings.stripAccents && { stripAccents: true }),
    ...(settings.enye !== 'auto' && { enye: settings.enye }),
    ...(settings.apostrophe !== 'auto' && { apostrophe: settings.apostrophe }),
    ...(settings.hyphen !== 'auto' && { hyphen: settings.hyphen }),
  };
  return Object.keys(options).length > 0 ? options : undefined;
}

export function formatLine(
  line: string,
  settings: NameSettings,
  format: NameFormat = settings.format,
): string {
  if (!line.trim()) return '';
  return formatName(line, format, { normalize: buildNormalizeOptions(settings) });
}

export function formatLines(input: string, settings: NameSettings): string {
  return input
    .split(/\r?\n/)
    .map((line) => formatLine(line, settings))
    .join('\n');
}

export function formatAll(
  name: string,
  settings: NameSettings,
): { id: NameFormat; value: string }[] {
  return nameFormats.map((id) => ({ id, value: formatLine(name, settings, id) }));
}

export function splitParts(
  name: string,
  settings: NameSettings,
): { id: SplitPartId; value: string }[] {
  const formatted = formatLine(name, settings);
  const parts = formatted
    ? splitName(formatted, { strategy: settings.strategy, convention: settings.convention })
    : null;
  return splitPartIds.map((id) => ({ id, value: parts ? parts[id] : '' }));
}
