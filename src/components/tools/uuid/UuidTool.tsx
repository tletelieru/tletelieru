import { useCallback, useMemo, useState, type ChangeEvent } from 'react';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { clampInt, nonEmptyLines } from '~/lib/tools/_shared/lines';
import {
  NANOID_ALPHABET,
  formatId,
  generateIds,
  idCases,
  idTypes,
  inspectId,
  type IdCase,
  type IdGenerateOptions,
  type IdType,
} from '~/lib/tools/uuid';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { uuidMessages } from './messages';

type Mode = 'generate' | 'inspect';

type UuidMessages = (typeof uuidMessages)['en'];

const defaults = {
  mode: 'generate',
  input: '',
  type: 'v4',
  count: 5,
  case: 'default',
  hyphens: true,
  monotonic: true,
  size: 21,
  alphabet: '',
};

type State = typeof defaults;

function toType(value: string): IdType {
  return (idTypes as readonly string[]).includes(value) ? (value as IdType) : 'v4';
}

function toCase(value: string): IdCase {
  return (idCases as readonly string[]).includes(value) ? (value as IdCase) : 'default';
}

function generateOptions(state: State): IdGenerateOptions {
  return {
    type: toType(state.type),
    count: clampInt(state.count, 1, 1000),
    monotonic: state.monotonic,
    size: Math.trunc(state.size),
    alphabet: state.alphabet || NANOID_ALPHABET,
  };
}

function describeLine(line: string, t: UuidMessages): string {
  const result = inspectId(line);
  if (result.kind === 'nil') return t.nil(line);
  if (result.kind === 'max') return t.max(line);
  if (result.kind === 'ulid') return t.ulid(line, result.time.iso);
  if (result.kind === 'uuid') {
    return t.uuid(line, result.version, t.variantName[result.variant], result.time?.iso);
  }
  return t.invalid(line);
}

export default function UuidTool() {
  const t = useMessages(uuidMessages);
  const [state, update] = useUrlState(defaults);
  const mode: Mode = state.mode === 'inspect' ? 'inspect' : 'generate';
  const type = toType(state.type);
  const letterCase = toCase(state.case);
  const [generated, setGenerated] = useState(() => generateIds(generateOptions(state)));

  const change = useCallback(
    (patch: Partial<State>) => {
      update(patch);
      setGenerated(generateIds(generateOptions({ ...state, ...patch })));
    },
    [update, state],
  );

  const lines = useMemo(() => nonEmptyLines(state.input), [state.input]);

  const output = useMemo(() => {
    if (mode === 'inspect') return lines.map((line) => describeLine(line, t)).join('\n');
    if (!generated.ok) return '';
    return generated.ids
      .map((id) => formatId(id, type, { letterCase, hyphens: state.hyphens }))
      .join('\n');
  }, [mode, lines, t, generated, type, letterCase, state.hyphens]);

  const recognized = useMemo(
    () =>
      mode === 'inspect' ? lines.filter((line) => inspectId(line).kind !== 'invalid').length : 0,
    [mode, lines],
  );

  const onModeChange = useCallback(
    (_: unknown, value: Mode | null) => {
      if (value) update({ mode: value });
    },
    [update],
  );

  const onTypeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      change({ type: toType(event.target.value) }),
    [change],
  );

  const onCaseChange = useCallback(
    (_: unknown, value: IdCase | null) => {
      if (value) update({ case: value });
    },
    [update],
  );

  const onHyphensChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ hyphens: event.target.checked }),
    [update],
  );

  const onMonotonicChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => change({ monotonic: event.target.checked }),
    [change],
  );

  const onCountChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      change({ count: clampInt(Number(event.target.value), 1, 1000) }),
    [change],
  );

  const onSizeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      change({ size: Number(event.target.value) }),
    [change],
  );

  const onAlphabetChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      change({ alphabet: event.target.value }),
    [change],
  );

  const onRegenerate = useCallback(() => change({}), [change]);

  const onInputChange = useCallback((input: string) => update({ input }), [update]);

  const isUuid = type === 'v4' || type === 'v7';

  return (
    <ToolLayout
      options={
        <>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={mode}
            onChange={onModeChange}
            aria-label={t.mode}
          >
            <ToggleButton value="generate">{t.generate}</ToggleButton>
            <ToggleButton value="inspect">{t.inspect}</ToggleButton>
          </ToggleButtonGroup>
          {mode === 'generate' && (
            <>
              <TextField
                select
                label={t.type}
                value={type}
                onChange={onTypeChange}
                sx={{ width: 240 }}
              >
                {idTypes.map((value) => (
                  <MenuItem key={value} value={value}>
                    {t.typeName[value]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                type="number"
                label={t.howMany}
                value={state.count}
                sx={{ width: 120 }}
                slotProps={{ htmlInput: { min: 1, max: 1000 } }}
                onChange={onCountChange}
              />
              {type !== 'nanoid' && (
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={letterCase}
                  onChange={onCaseChange}
                  aria-label={t.letterCase}
                >
                  {idCases.map((value) => (
                    <ToggleButton key={value} value={value} sx={{ textTransform: 'none' }}>
                      {t.caseName[value]}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              )}
              {isUuid && (
                <FormControlLabel
                  control={<Switch checked={state.hyphens} onChange={onHyphensChange} />}
                  label={t.hyphens}
                />
              )}
              {type === 'ulid' && (
                <FormControlLabel
                  control={<Switch checked={state.monotonic} onChange={onMonotonicChange} />}
                  label={t.monotonic}
                />
              )}
              {type === 'nanoid' && (
                <>
                  <TextField
                    type="number"
                    label={t.size}
                    value={state.size}
                    sx={{ width: 100 }}
                    slotProps={{ htmlInput: { min: 1, max: 256 } }}
                    onChange={onSizeChange}
                  />
                  <TextField
                    label={t.alphabet}
                    value={state.alphabet}
                    placeholder={NANOID_ALPHABET}
                    sx={{ minWidth: 320 }}
                    onChange={onAlphabetChange}
                  />
                </>
              )}
              <Button variant="outlined" onClick={onRegenerate}>
                {t.generateAgain}
              </Button>
            </>
          )}
        </>
      }
      input={
        mode === 'inspect' && (
          <InputPanel
            label={t.inputLabel}
            placeholder={
              '018f4df7-3e00-7000-8000-000000000000\n01ARYZ6S41TSV4RRFFQ69G5FAV\n00000000-0000-0000-0000-000000000000'
            }
            value={state.input}
            onChange={onInputChange}
          />
        )
      }
      output={
        <OutputPanel
          value={output}
          error={mode === 'generate' && !generated.ok ? t.errors[generated.error] : null}
          actions={
            mode === 'inspect' &&
            lines.length > 0 && (
              <Typography variant="body2" color="text.secondary">
                {t.summary(recognized, lines.length)}
              </Typography>
            )
          }
        />
      }
    />
  );
}
