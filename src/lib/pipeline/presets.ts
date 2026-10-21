import { normalizeStep } from './serialize';
import type { PipelineStep } from './types';

export const presetIds = ['list-sql-in', 'base64-json', 'names-snake-sql-in'] as const;

export type PresetId = (typeof presetIds)[number];

export interface PipelinePreset {
  id: PresetId;
  input: string;
  steps: PipelineStep[];
}

function steps(...items: [string, Record<string, string>?][]): PipelineStep[] {
  return items
    .map(([op, options = {}]) => normalizeStep({ op, options }))
    .filter((step): step is PipelineStep => step !== null);
}

export const pipelinePresets: readonly PipelinePreset[] = [
  {
    id: 'list-sql-in',
    input: 'apple\n banana \n\napple\ncherry\nbanana',
    steps: steps(['trim-lines'], ['remove-blank'], ['dedupe'], ['sql-in-text']),
  },
  {
    id: 'base64-json',
    input: 'eyJuYW1lIjoiQWRhIiwidGFncyI6WyJtYXRoIiwiY29kZSJdLCJhY3RpdmUiOnRydWV9',
    steps: steps(['base64-decode'], ['json-format']),
  },
  {
    id: 'names-snake-sql-in',
    input: 'First Name\nLast Name\nEmail Address\nfirstName',
    steps: steps(
      ['trim-lines'],
      ['remove-blank'],
      ['case', { to: 'snake' }],
      ['dedupe'],
      ['sql-in-text', { column: 'field' }],
    ),
  },
];

export function getPreset(id: string): PipelinePreset | undefined {
  return pipelinePresets.find((preset) => preset.id === id);
}
