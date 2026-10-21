import { useCallback, useMemo, type ChangeEvent } from 'react';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import {
  formatBytes,
  processJson,
  type JsonIndent,
  type JsonMode,
  type JsonStats,
} from '~/lib/tools/json';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { jsonMessages } from './messages';

const defaults = { mode: 'format', indent: '2', sortKeys: false, input: '' };

const modes: JsonMode[] = ['format', 'minify', 'validate'];
const indents: JsonIndent[] = ['2', '4', 'tab'];

function describeSize(stats: JsonStats, mode: JsonMode): string {
  return mode === 'validate'
    ? formatBytes(stats.inputBytes)
    : `${formatBytes(stats.inputBytes)} → ${formatBytes(stats.outputBytes)}`;
}

export default function JsonTool() {
  const t = useMessages(jsonMessages);
  const [state, update] = useUrlState(defaults);
  const mode: JsonMode = modes.includes(state.mode as JsonMode)
    ? (state.mode as JsonMode)
    : 'format';
  const indent: JsonIndent = indents.includes(state.indent as JsonIndent)
    ? (state.indent as JsonIndent)
    : '2';

  const result = useMemo(
    () =>
      state.input.trim()
        ? processJson(state.input, { mode, indent, sortKeys: state.sortKeys })
        : null,
    [state.input, mode, indent, state.sortKeys],
  );

  const output = useMemo(() => {
    if (!result) return '';
    if (!result.ok) return result.error.excerpt;
    return mode === 'validate' ? t.valid : result.output;
  }, [result, mode, t]);

  const onModeChange = useCallback(
    (_: unknown, value: JsonMode | null) => {
      if (value) update({ mode: value });
    },
    [update],
  );

  const onIndentChange = useCallback(
    (_: unknown, value: JsonIndent | null) => {
      if (value) update({ indent: value });
    },
    [update],
  );

  const onSortKeysChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ sortKeys: event.target.checked }),
    [update],
  );

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
            <ToggleButton value="format">{t.format}</ToggleButton>
            <ToggleButton value="minify">{t.minify}</ToggleButton>
            <ToggleButton value="validate">{t.validate}</ToggleButton>
          </ToggleButtonGroup>
          {mode === 'format' && (
            <ToggleButtonGroup
              exclusive
              size="small"
              value={indent}
              onChange={onIndentChange}
              aria-label={t.indent}
            >
              <ToggleButton value="2">{t.spaces(2)}</ToggleButton>
              <ToggleButton value="4">{t.spaces(4)}</ToggleButton>
              <ToggleButton value="tab">{t.tab}</ToggleButton>
            </ToggleButtonGroup>
          )}
          {mode !== 'validate' && (
            <FormControlLabel
              control={<Switch checked={state.sortKeys} onChange={onSortKeysChange} />}
              label={t.sortKeys}
            />
          )}
        </>
      }
      input={
        <InputPanel
          label={t.inputLabel}
          placeholder={'{"name": "tletelieru", "tools": [1, 2, 3]}'}
          value={state.input}
          onChange={onInputChange}
        />
      }
      output={
        <OutputPanel
          value={output}
          error={
            result && !result.ok
              ? t.error(result.error.line, result.error.column, result.error)
              : null
          }
          actions={
            result?.ok && (
              <Typography variant="body2" color="text.secondary">
                {t.stats(describeSize(result.stats, mode), result.stats.depth, result.stats.keys)}
              </Typography>
            )
          }
        />
      }
    />
  );
}
