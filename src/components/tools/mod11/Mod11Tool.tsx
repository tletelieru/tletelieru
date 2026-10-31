import { useCallback, useMemo } from 'react';
import Button from '@mui/material/Button';
import { useMessages } from '~/i18n/react';
import {
  computeMod11Lines,
  mod11Directions,
  mod11PresetIds,
  mod11Presets,
  mod11Results,
  parseWeights,
  type Mod11Calculation,
  type Mod11Options,
  type Mod11Preset,
} from '~/lib/tools/mod11';
import { pickOption } from '~/lib/tools/sql/format';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { ChoiceToggle, TextOption, useSetter } from '../_shared/options';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { mod11Messages } from './messages';

type Messages = (typeof mod11Messages)['en'];

const defaults = { input: '', ...mod11Presets.rut } as {
  input: string;
  weights: string;
  direction: string;
  result: string;
  ten: string;
  eleven: string;
};

const PLACEHOLDER = '12345678';

function steps(calculation: Mod11Calculation, options: Mod11Options, t: Messages): string {
  const { steps: list, sum, remainder, value, check } = calculation;
  const lines = [
    calculation.input,
    ...list.map(({ digit, weight, product }) => `  ${digit} × ${weight} = ${product}`),
    `  ${t.sum} = ${sum}`,
    `  ${sum} mod 11 = ${remainder}`,
  ];
  if (options.result === 'complement') lines.push(`  11 − ${remainder} = ${value}`);
  lines.push(`  ${t.check}: ${check}`);
  return lines.join('\n');
}

function report(input: string, options: Mod11Options, t: Messages): string {
  return computeMod11Lines(input, options)
    .map((line) => ('invalid' in line ? t.invalid(line.input) : steps(line, options, t)))
    .join('\n\n');
}

export default function Mod11Tool() {
  const t = useMessages(mod11Messages);
  const [state, update] = useUrlState(defaults);

  const options: Mod11Options = useMemo(
    () => ({
      weights: state.weights,
      direction: pickOption(state.direction, mod11Directions, 'right'),
      result: pickOption(state.result, mod11Results, 'complement'),
      ten: state.ten,
      eleven: state.eleven,
    }),
    [state.weights, state.direction, state.result, state.ten, state.eleven],
  );

  const output = useMemo(() => report(state.input, options, t), [state.input, options, t]);
  const preview = useMemo(() => report(PLACEHOLDER, options, t), [options, t]);
  const validWeights = useMemo(() => parseWeights(options.weights) !== null, [options.weights]);

  const onInput = useCallback((input: string) => update({ input }), [update]);
  const onWeights = useSetter(update, 'weights');
  const onDirection = useSetter(update, 'direction');
  const onResult = useSetter(update, 'result');
  const onTen = useSetter(update, 'ten');
  const onEleven = useSetter(update, 'eleven');
  const applyPreset = useCallback(
    (preset: Mod11Preset) => update({ ...mod11Presets[preset] }),
    [update],
  );

  return (
    <ToolLayout
      options={
        <>
          {mod11PresetIds.map((preset) => (
            <Button key={preset} variant="outlined" onClick={() => applyPreset(preset)}>
              {t.presets[preset]}
            </Button>
          ))}
          <TextOption label={t.weights} value={state.weights} onChange={onWeights} width={200} />
          <ChoiceToggle
            label={t.direction}
            value={options.direction}
            options={mod11Directions}
            labels={t.directions}
            onChange={onDirection}
          />
          <ChoiceToggle
            label={t.result}
            value={options.result}
            options={mod11Results}
            labels={t.results}
            onChange={onResult}
          />
          <TextOption label={t.ten} value={state.ten} onChange={onTen} width={90} />
          <TextOption label={t.eleven} value={state.eleven} onChange={onEleven} width={90} />
        </>
      }
      input={
        <InputPanel
          label={t.input}
          placeholder={PLACEHOLDER}
          value={state.input}
          onChange={onInput}
          minRows={3}
        />
      }
      output={
        <OutputPanel
          value={output}
          placeholder={preview}
          error={validWeights ? null : t.badWeights}
        />
      }
    />
  );
}
