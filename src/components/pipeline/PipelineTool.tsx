import { useCallback, useMemo, useState, type MouseEvent } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { getOperation, pipelineOperations } from '~/lib/pipeline/operations';
import { resolveOptions } from '~/lib/pipeline/options';
import { getPreset, pipelinePresets } from '~/lib/pipeline/presets';
import { runPipeline } from '~/lib/pipeline/run';
import { decodeSteps, encodeSteps, MAX_STEPS } from '~/lib/pipeline/serialize';
import { operationGroups, type PipelineStep } from '~/lib/pipeline/types';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../tools/_shared/InputPanel';
import { OutputPanel } from '../tools/_shared/OutputPanel';
import { pipelineMessages } from './messages';
import { StepCard } from './StepCard';

const defaults = { input: '', steps: '' };

export default function PipelineTool() {
  const t = useMessages(pipelineMessages);
  const [state, update] = useUrlState(defaults);
  const [addAnchor, setAddAnchor] = useState<HTMLElement | null>(null);
  const [presetAnchor, setPresetAnchor] = useState<HTMLElement | null>(null);

  const steps = useMemo(() => decodeSteps(state.steps), [state.steps]);
  const result = useMemo(() => runPipeline(state.input, steps), [state.input, steps]);

  const setSteps = useCallback(
    (next: PipelineStep[]) => update({ steps: encodeSteps(next) }),
    [update],
  );

  const onInputChange = useCallback((value: string) => update({ input: value }), [update]);

  const onStepChange = useCallback(
    (index: number, step: PipelineStep) =>
      setSteps(steps.map((current, position) => (position === index ? step : current))),
    [setSteps, steps],
  );

  const onStepMove = useCallback(
    (index: number, offset: number) => {
      const target = index + offset;
      if (target < 0 || target >= steps.length) return;
      const next = [...steps];
      const [moved] = next.splice(index, 1);
      if (!moved) return;
      next.splice(target, 0, moved);
      setSteps(next);
    },
    [setSteps, steps],
  );

  const onStepRemove = useCallback(
    (index: number) => setSteps(steps.filter((_, position) => position !== index)),
    [setSteps, steps],
  );

  const openAdd = useCallback(
    (event: MouseEvent<HTMLElement>) => setAddAnchor(event.currentTarget),
    [],
  );
  const closeAdd = useCallback(() => setAddAnchor(null), []);
  const openPresets = useCallback(
    (event: MouseEvent<HTMLElement>) => setPresetAnchor(event.currentTarget),
    [],
  );
  const closePresets = useCallback(() => setPresetAnchor(null), []);

  const addStep = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      const operation = getOperation(event.currentTarget.dataset.op ?? '');
      setAddAnchor(null);
      if (!operation) return;
      setSteps([...steps, { op: operation.id, options: resolveOptions(operation.options) }]);
    },
    [setSteps, steps],
  );

  const loadPreset = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      const preset = getPreset(event.currentTarget.dataset.preset ?? '');
      setPresetAnchor(null);
      if (!preset) return;
      update({
        steps: encodeSteps(preset.steps),
        ...(state.input.trim() ? {} : { input: preset.input }),
      });
    },
    [state.input, update],
  );

  const addItems = useMemo(
    () =>
      operationGroups.flatMap((group) => [
        <ListSubheader key={`group-${group}`}>{t.groups[group]}</ListSubheader>,
        ...pipelineOperations
          .filter((operation) => operation.group === group)
          .map((operation) => (
            <MenuItem key={operation.id} data-op={operation.id} onClick={addStep}>
              {t.ops[operation.id] ?? operation.id}
            </MenuItem>
          )),
      ]),
    [addStep, t],
  );

  const failedMessage = result.failedAt === null ? null : t.failedAt(result.failedAt + 1);

  return (
    <Stack spacing={2}>
      <InputPanel label={t.inputLabel} value={state.input} onChange={onInputChange} minRows={4} />
      {!state.input.trim() && <Alert severity="info">{t.emptyHint}</Alert>}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          {t.steps}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={openPresets}
          aria-haspopup="menu"
          aria-expanded={presetAnchor !== null}
        >
          {t.presets}
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={openAdd}
          disabled={steps.length >= MAX_STEPS}
          aria-haspopup="menu"
          aria-expanded={addAnchor !== null}
        >
          {t.addStep}
        </Button>
      </Stack>
      <Menu anchorEl={presetAnchor} open={presetAnchor !== null} onClose={closePresets}>
        {pipelinePresets.map((preset) => (
          <MenuItem key={preset.id} data-preset={preset.id} onClick={loadPreset}>
            {t.presetNames[preset.id]}
          </MenuItem>
        ))}
      </Menu>
      <Menu
        anchorEl={addAnchor}
        open={addAnchor !== null}
        onClose={closeAdd}
        slotProps={{ paper: { sx: { maxHeight: 420 } } }}
      >
        {addItems}
      </Menu>
      {steps.length === 0 && <Alert severity="info">{t.noStepsHint}</Alert>}
      {steps.length > 0 && (
        <Stack component="ol" spacing={1.5} aria-label={t.steps} sx={{ m: 0, p: 0 }}>
          {steps.map((step, index) => (
            <StepCard
              key={index}
              index={index}
              total={steps.length}
              step={step}
              outcome={result.steps[index]}
              onChange={onStepChange}
              onMove={onStepMove}
              onRemove={onStepRemove}
            />
          ))}
        </Stack>
      )}
      <OutputPanel label={t.finalOutput} value={result.output ?? ''} error={failedMessage} />
    </Stack>
  );
}
