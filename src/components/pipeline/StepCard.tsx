import { useCallback, useMemo, useState, type ChangeEvent } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import ListSubheader from '@mui/material/ListSubheader';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { getOperation, pipelineOperations } from '~/lib/pipeline/operations';
import { resolveOptions } from '~/lib/pipeline/options';
import {
  operationGroups,
  type OptionSpec,
  type PipelineStep,
  type StepOutcome,
} from '~/lib/pipeline/types';
import { CodeField } from '../tools/_shared/CodeField';
import { CopyButton } from '../tools/_shared/CopyButton';
import { pipelineMessages } from './messages';

interface StepCardProps {
  index: number;
  total: number;
  step: PipelineStep;
  outcome: StepOutcome | undefined;
  onChange: (index: number, step: PipelineStep) => void;
  onMove: (index: number, offset: number) => void;
  onRemove: (index: number) => void;
}

function isToggle(spec: OptionSpec): boolean {
  return spec.kind === 'enum' && spec.values.length === 2 && spec.values.includes('yes');
}

function OptionControl({
  spec,
  value,
  onChange,
}: {
  spec: OptionSpec;
  value: string;
  onChange: (key: string, value: string) => void;
}) {
  const t = useMessages(pipelineMessages);
  const label = t.options[spec.key] ?? spec.key;

  const onFieldChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(spec.key, event.target.value),
    [onChange, spec.key],
  );

  const onToggle = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      onChange(spec.key, event.target.checked ? 'yes' : 'no'),
    [onChange, spec.key],
  );

  if (spec.kind === 'text') {
    return (
      <TextField
        size="small"
        label={label}
        value={value}
        onChange={onFieldChange}
        sx={{ width: 200 }}
      />
    );
  }
  if (isToggle(spec)) {
    return (
      <FormControlLabel
        control={<Switch checked={value === 'yes'} onChange={onToggle} />}
        label={label}
      />
    );
  }
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      onChange={onFieldChange}
      sx={{ minWidth: 180 }}
    >
      {spec.values.map((option) => (
        <MenuItem key={option} value={option}>
          {t.values[spec.key]?.[option] ?? option}
        </MenuItem>
      ))}
    </TextField>
  );
}

export function StepCard({
  index,
  total,
  step,
  outcome,
  onChange,
  onMove,
  onRemove,
}: StepCardProps) {
  const t = useMessages(pipelineMessages);
  const [expanded, setExpanded] = useState(false);
  const operation = getOperation(step.op);
  const position = index + 1;

  const opItems = useMemo(
    () =>
      operationGroups.flatMap((group) => [
        <ListSubheader key={`group-${group}`}>{t.groups[group]}</ListSubheader>,
        ...pipelineOperations
          .filter((item) => item.group === group)
          .map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {t.ops[item.id] ?? item.id}
            </MenuItem>
          )),
      ]),
    [t],
  );

  const onOpChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const next = getOperation(event.target.value);
      if (next) onChange(index, { op: next.id, options: resolveOptions(next.options) });
    },
    [index, onChange],
  );

  const onOptionChange = useCallback(
    (key: string, value: string) =>
      onChange(index, { op: step.op, options: { ...step.options, [key]: value } }),
    [index, onChange, step],
  );

  const moveUp = useCallback(() => onMove(index, -1), [index, onMove]);
  const moveDown = useCallback(() => onMove(index, 1), [index, onMove]);
  const remove = useCallback(() => onRemove(index), [index, onRemove]);
  const toggle = useCallback(() => setExpanded((value) => !value), []);

  const output = outcome?.output ?? null;
  const error = outcome?.error ?? null;

  return (
    <Paper
      variant="outlined"
      component="li"
      aria-label={t.step(position)}
      sx={{ p: 2, listStyle: 'none' }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ alignItems: 'center', flexWrap: 'wrap' }}
        >
          <Typography variant="subtitle2" sx={{ minWidth: 56 }}>
            {t.step(position)}
          </Typography>
          <TextField
            select
            size="small"
            label={t.operation}
            value={operation ? operation.id : ''}
            onChange={onOpChange}
            sx={{ minWidth: 220, flexGrow: 1 }}
          >
            {opItems}
          </TextField>
          <Button size="small" onClick={moveUp} disabled={index === 0} aria-label={t.moveUp}>
            ↑
          </Button>
          <Button
            size="small"
            onClick={moveDown}
            disabled={index === total - 1}
            aria-label={t.moveDown}
          >
            ↓
          </Button>
          <Button size="small" color="error" onClick={remove}>
            {t.remove}
          </Button>
        </Stack>
        {operation && operation.options.length > 0 && (
          <Stack
            direction="row"
            spacing={2}
            useFlexGap
            sx={{ flexWrap: 'wrap', alignItems: 'center' }}
          >
            {operation.options.map((spec) => (
              <OptionControl
                key={spec.key}
                spec={spec}
                value={step.options[spec.key] ?? spec.default}
                onChange={onOptionChange}
              />
            ))}
          </Stack>
        )}
        {error && <Alert severity="error">{t.error(error)}</Alert>}
        {!error && output === null && (
          <Typography variant="body2" color="text.secondary">
            {t.skipped}
          </Typography>
        )}
        {output !== null && (
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Button size="small" onClick={toggle} aria-expanded={expanded}>
                {expanded ? t.hideOutput : t.showOutput}
              </Button>
              <span style={{ flexGrow: 1 }} />
              {expanded && <CopyButton text={output} />}
            </Stack>
            {expanded && (
              <CodeField
                value={output}
                minRows={2}
                maxRows={12}
                slotProps={{ htmlInput: { readOnly: true, 'aria-label': t.stepOutput(position) } }}
              />
            )}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
