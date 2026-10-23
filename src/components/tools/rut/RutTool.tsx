import { useCallback, useMemo, useState, type ChangeEvent } from 'react';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import {
  formatRut,
  generateRuts,
  isRutStyle,
  joinRut,
  rutStyles,
  validateRut,
  type RutFormatOptions,
  type RutStyle,
} from '~/lib/tools/rut';
import { clampInt, nonEmptyLines } from '~/lib/tools/_shared/lines';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { rutMessages } from './messages';

type Mode = 'validate' | 'format' | 'generate';

type RutMessages = (typeof rutMessages)['en'];

const defaults = { mode: 'validate', input: '', style: 'dots', upperK: true, count: 10 };

const styleSample = { body: '12345678', dv: '5' };

const placeholder = '12.345.678-5\n11111111-1\n10000013k';

const placeholderLines = nonEmptyLines(placeholder);

function describeLine(line: string, format: RutFormatOptions, t: RutMessages): string {
  const result = validateRut(line, format);
  if (result.valid) return t.valid(result.formatted);
  if (result.reason === 'dv') return t.wrongDv(line, result.expectedDv ?? '');
  return t.notRut(line);
}

function processLines(
  mode: Mode,
  lines: string[],
  format: RutFormatOptions,
  t: RutMessages,
): string {
  if (mode === 'format') {
    return lines.map((line) => formatRut(line, format) ?? t.notRut(line)).join('\n');
  }
  return lines.map((line) => describeLine(line, format, t)).join('\n');
}

export default function RutTool() {
  const t = useMessages(rutMessages);
  const [state, update] = useUrlState(defaults);
  const mode = state.mode as Mode;
  const style: RutStyle = isRutStyle(state.style) ? state.style : 'dots';
  const format = useMemo(() => ({ style, upperK: state.upperK }), [style, state.upperK]);
  const [generated, setGenerated] = useState(() =>
    generateRuts({ count: clampInt(state.count, 1, 1000) }),
  );

  const lines = useMemo(() => nonEmptyLines(state.input), [state.input]);

  const output = useMemo(() => {
    if (mode === 'generate') {
      return generated.map((rut) => formatRut(rut, format) ?? rut).join('\n');
    }
    return processLines(mode, lines, format, t);
  }, [mode, generated, lines, format, t]);

  const outputPlaceholder = useMemo(
    () => (mode === 'generate' ? undefined : processLines(mode, placeholderLines, format, t)),
    [mode, format, t],
  );

  const validCount = useMemo(
    () => (mode === 'validate' ? lines.filter((line) => validateRut(line).valid).length : 0),
    [mode, lines],
  );

  const regenerate = useCallback(
    (count: number) => setGenerated(generateRuts({ count: clampInt(count, 1, 1000) })),
    [],
  );

  const onModeChange = useCallback(
    (_: unknown, value: Mode | null) => {
      if (value) update({ mode: value });
    },
    [update],
  );

  const onStyleChange = useCallback(
    (_: unknown, value: RutStyle | null) => {
      if (value) update({ style: value });
    },
    [update],
  );

  const onUpperKChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ upperK: event.target.checked }),
    [update],
  );

  const onCountChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const count = clampInt(Number(event.target.value), 1, 1000);
      update({ count });
      regenerate(count);
    },
    [update, regenerate],
  );

  const onRegenerate = useCallback(() => regenerate(state.count), [regenerate, state.count]);

  const onInputChange = useCallback((input: string) => update({ input }), [update]);

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
            <ToggleButton value="validate">{t.validate}</ToggleButton>
            <ToggleButton value="format">{t.format}</ToggleButton>
            <ToggleButton value="generate">{t.generate}</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={style}
            onChange={onStyleChange}
            aria-label={t.style}
          >
            {rutStyles.map((option) => (
              <ToggleButton
                key={option}
                value={option}
                aria-label={t.styleName[option]}
                title={t.styleName[option]}
                sx={{ fontFamily: 'var(--sl-font-mono, monospace)', textTransform: 'none' }}
              >
                {joinRut(styleSample, { style: option })}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <FormControlLabel
            control={<Switch checked={state.upperK} onChange={onUpperKChange} />}
            label={t.upperK}
          />
          {mode === 'generate' && (
            <>
              <TextField
                type="number"
                label={t.howMany}
                value={state.count}
                sx={{ width: 120 }}
                fullWidth={false}
                slotProps={{ htmlInput: { min: 1, max: 1000 } }}
                onChange={onCountChange}
              />
              <Button variant="outlined" onClick={onRegenerate}>
                {t.generateAgain}
              </Button>
            </>
          )}
        </>
      }
      input={
        !(mode === 'generate') && (
          <InputPanel
            label={t.inputLabel}
            placeholder={placeholder}
            value={state.input}
            onChange={onInputChange}
          />
        )
      }
      output={
        <OutputPanel
          value={output}
          placeholder={outputPlaceholder}
          actions={
            mode === 'validate' &&
            lines.length > 0 && (
              <Typography variant="body2" color="text.secondary">
                {t.summary(validCount, lines.length)}
              </Typography>
            )
          }
        />
      }
    />
  );
}
