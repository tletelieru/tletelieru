import { useCallback, useMemo, type ChangeEvent, type ReactNode } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { toFormatStyle, type FormatStyle, type IdValidation } from '~/lib/tools/ids/shared';
import { clampInt, nonEmptyLines } from '~/lib/tools/_shared/lines';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { idLinesMessages } from './messages';

type IdLinesMessages = (typeof idLinesMessages)['en'];

function describeLine(
  line: string,
  result: IdValidation,
  noun: string,
  t: IdLinesMessages,
): string {
  if (result.valid) return t.valid(result.formatted);
  if (result.reason === 'dv') {
    return result.expected ? t.wrongDv(line, result.expected) : t.invalidDv(line);
  }
  if (result.reason === 'repeated') return t.repeated(line);
  return t.notA(line, noun);
}

function processLines(
  mode: IdMode,
  lines: string[],
  style: FormatStyle,
  validate: (line: string) => IdValidation,
  format: (line: string, style: FormatStyle) => string | null,
  noun: string,
  t: IdLinesMessages,
): string {
  if (mode === 'format') {
    return lines.map((line) => format(line, style) ?? t.notA(line, noun)).join('\n');
  }
  return lines.map((line) => describeLine(line, validate(line), noun, t)).join('\n');
}

export type IdMode = 'validate' | 'format' | 'generate';

export type IdLinesState = {
  mode: string;
  input: string;
  style: string;
  count: number;
};

export const MAX_COUNT = 1000;

export const idLinesDefaults: IdLinesState = {
  mode: 'validate',
  input: '',
  style: 'full',
  count: 10,
};

export function clampCount(count: number): number {
  return clampInt(count, 1, MAX_COUNT);
}

interface IdLinesToolProps {
  state: IdLinesState;
  onPatch: (patch: Partial<IdLinesState>) => void;
  generated: string[];
  onRegenerate: (count: number) => void;
  validate: (line: string) => IdValidation;
  format: (line: string, style: FormatStyle) => string | null;
  styles: readonly FormatStyle[];
  noun: string;
  inputLabel: string;
  placeholder: string;
  selectors?: ReactNode;
  generateOptions?: ReactNode;
}

export function IdLinesTool({
  state,
  onPatch,
  generated,
  onRegenerate,
  validate,
  format,
  styles,
  noun,
  inputLabel,
  placeholder,
  selectors,
  generateOptions,
}: IdLinesToolProps) {
  const t = useMessages(idLinesMessages);
  const mode = state.mode as IdMode;
  const style = toFormatStyle(state.style, styles);
  const lines = useMemo(() => nonEmptyLines(state.input), [state.input]);
  const sample = useMemo(() => nonEmptyLines(placeholder)[0] ?? '', [placeholder]);

  const output = useMemo(() => {
    if (mode === 'generate') {
      return generated.map((value) => format(value, style) ?? value).join('\n');
    }
    return processLines(mode, lines, style, validate, format, noun, t);
  }, [mode, generated, lines, style, format, validate, noun, t]);

  const outputPlaceholder = useMemo(
    () =>
      mode === 'generate'
        ? undefined
        : processLines(mode, nonEmptyLines(placeholder), style, validate, format, noun, t),
    [mode, placeholder, style, validate, format, noun, t],
  );

  const validCount = useMemo(
    () => (mode === 'validate' ? lines.filter((line) => validate(line).valid).length : 0),
    [mode, lines, validate],
  );

  const onModeChange = useCallback(
    (_: unknown, value: IdMode | null) => {
      if (value) onPatch({ mode: value });
    },
    [onPatch],
  );

  const onStyleChange = useCallback(
    (_: unknown, value: FormatStyle | null) => {
      if (value) onPatch({ style: value });
    },
    [onPatch],
  );

  const onCountChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const count = clampCount(Number(event.target.value));
      onPatch({ count });
      onRegenerate(count);
    },
    [onPatch, onRegenerate],
  );

  const onRegenerateClick = useCallback(
    () => onRegenerate(state.count),
    [onRegenerate, state.count],
  );

  const onInputChange = useCallback((input: string) => onPatch({ input }), [onPatch]);

  return (
    <ToolLayout
      options={
        <>
          {selectors}
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
          {mode !== 'validate' && styles.length > 1 && (
            <ToggleButtonGroup
              exclusive
              size="small"
              value={style}
              onChange={onStyleChange}
              aria-label={t.outputStyle}
            >
              {styles.map((option) => (
                <ToggleButton
                  key={option}
                  value={option}
                  title={format(sample, option) ?? undefined}
                >
                  {t.styles[option]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
          {mode === 'generate' && (
            <>
              {generateOptions}
              <TextField
                type="number"
                label={t.howMany}
                value={state.count}
                sx={{ width: 120 }}
                fullWidth={false}
                slotProps={{ htmlInput: { min: 1, max: MAX_COUNT } }}
                onChange={onCountChange}
              />
              <Button variant="outlined" onClick={onRegenerateClick}>
                {t.generateAgain}
              </Button>
            </>
          )}
        </>
      }
      input={
        !(mode === 'generate') && (
          <InputPanel
            label={inputLabel}
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
