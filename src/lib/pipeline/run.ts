import { getOperation } from './operations';
import { resolveOptions } from './options';
import type { PipelineResult, PipelineStep, StepOutcome, StepResult } from './types';

export function runPipeline(input: string, steps: readonly PipelineStep[]): PipelineResult {
  const outcomes: StepOutcome[] = [];
  let current: string | null = input;
  let failedAt: number | null = null;
  for (const [index, step] of steps.entries()) {
    if (current === null) {
      outcomes.push({ output: null, error: null });
      continue;
    }
    const operation = getOperation(step.op);
    const result: StepResult = operation
      ? operation.run(current, resolveOptions(operation.options, step.options))
      : { ok: false, error: { code: 'unknown-op', data: { op: step.op } } };
    if (result.ok) {
      current = result.output;
      outcomes.push({ output: result.output, error: null });
    } else {
      current = null;
      failedAt = index;
      outcomes.push({ output: null, error: result.error });
    }
  }
  return { steps: outcomes, output: current, failedAt };
}
