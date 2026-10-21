export const operationGroups = [
  'lines',
  'text',
  'case',
  'json',
  'sql',
  'ids',
  'time',
  'encoding',
] as const;

export type OperationGroup = (typeof operationGroups)[number];

export type OptionSpec =
  | { key: string; kind: 'enum'; values: readonly string[]; default: string }
  | { key: string; kind: 'text'; default: string };

export type OptionValues = Record<string, string>;

export interface StepError {
  code: string;
  data?: Record<string, string | number>;
}

export type StepResult = { ok: true; output: string } | { ok: false; error: StepError };

export interface PipelineOperation {
  id: string;
  group: OperationGroup;
  options: readonly OptionSpec[];
  run(input: string, options: OptionValues): StepResult;
}

export interface PipelineStep {
  op: string;
  options: OptionValues;
}

export interface StepOutcome {
  output: string | null;
  error: StepError | null;
}

export interface PipelineResult {
  steps: StepOutcome[];
  output: string | null;
  failedAt: number | null;
}
