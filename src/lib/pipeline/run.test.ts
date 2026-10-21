import { describe, expect, it } from 'vitest';
import { pipelinePresets } from './presets';
import { runPipeline } from './run';

describe('runPipeline', () => {
  it('returns the input when there are no steps', () => {
    expect(runPipeline('abc', [])).toEqual({ steps: [], output: 'abc', failedAt: null });
  });

  it('chains steps and keeps every intermediate output', () => {
    const result = runPipeline(' b \na\n\nb', [
      { op: 'trim-lines', options: {} },
      { op: 'remove-blank', options: {} },
      { op: 'dedupe', options: {} },
      { op: 'sql-in-text', options: { column: 'id' } },
    ]);
    expect(result.steps.map((step) => step.output)).toEqual([
      'b\na\n\nb',
      'b\na\nb',
      'b\na',
      "id IN ('b', 'a')",
    ]);
    expect(result.output).toBe("id IN ('b', 'a')");
    expect(result.failedAt).toBeNull();
  });

  it('stops at the first failing step', () => {
    const result = runPipeline('not json', [
      { op: 'trim', options: {} },
      { op: 'json-format', options: {} },
      { op: 'upper', options: {} },
    ]);
    expect(result.failedAt).toBe(1);
    expect(result.output).toBeNull();
    expect(result.steps[0]).toEqual({ output: 'not json', error: null });
    expect(result.steps[1]?.error?.code).toBe('json-invalid');
    expect(result.steps[2]).toEqual({ output: null, error: null });
  });

  it('reports unknown operations and ignores invalid option values', () => {
    expect(runPipeline('a', [{ op: 'nope', options: {} }]).steps[0]?.error).toEqual({
      code: 'unknown-op',
      data: { op: 'nope' },
    });
    expect(runPipeline('a b', [{ op: 'case', options: { to: 'weird' } }]).output).toBe('a_b');
  });

  it('runs every preset to the expected output', () => {
    const outputs = Object.fromEntries(
      pipelinePresets.map((preset) => [preset.id, runPipeline(preset.input, preset.steps).output]),
    );
    expect(outputs).toEqual({
      'list-sql-in': "IN ('apple', 'banana', 'cherry')",
      'base64-json':
        '{\n  "name": "Ada",\n  "tags": [\n    "math",\n    "code"\n  ],\n  "active": true\n}',
      'names-snake-sql-in': "field IN ('first_name', 'last_name', 'email_address')",
    });
  });
});
