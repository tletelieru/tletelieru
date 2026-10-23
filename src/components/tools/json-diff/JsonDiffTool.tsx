import { useCallback, useMemo } from 'react';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { arrayModes, diffJson, formatChanges } from '~/lib/tools/json-diff';
import { pickOption } from '~/lib/tools/sql/format';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { jsonMessages } from '../json/messages';
import { jsonDiffMessages } from './messages';

const defaults = { input: '', changed: '', arrays: 'index' };

const leftPlaceholder = '{"id": 7, "name": "Ana", "roles": ["admin", "dev"], "active": true}';
const rightPlaceholder = '{"name": "Ana María", "id": 7, "roles": ["dev"], "team": "core"}';

export default function JsonDiffTool() {
  const t = useMessages(jsonDiffMessages);
  const j = useMessages(jsonMessages);
  const [state, update] = useUrlState(defaults);
  const arrays = pickOption(state.arrays, arrayModes, 'index');
  const active = state.input.trim() !== '' && state.changed.trim() !== '';

  const result = useMemo(
    () => (active ? diffJson(state.input, state.changed, arrays) : null),
    [active, state.input, state.changed, arrays],
  );

  const outputPlaceholder = useMemo(() => {
    const preview = diffJson(leftPlaceholder, rightPlaceholder, arrays);
    return preview.ok ? formatChanges(preview.changes) : undefined;
  }, [arrays]);

  const output = useMemo(() => {
    if (!result) return '';
    if (!result.ok) return result.error.excerpt;
    return result.changes.length > 0 ? formatChanges(result.changes) : t.identical;
  }, [result, t]);

  const onArraysChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ arrays: value });
    },
    [update],
  );

  const onLeftChange = useCallback((input: string) => update({ input }), [update]);
  const onRightChange = useCallback((changed: string) => update({ changed }), [update]);

  return (
    <ToolLayout
      options={
        <ToggleButtonGroup
          exclusive
          size="small"
          value={arrays}
          onChange={onArraysChange}
          aria-label={t.arrays}
        >
          <ToggleButton value="index">{t.byIndex}</ToggleButton>
          <ToggleButton value="set">{t.asSet}</ToggleButton>
        </ToggleButtonGroup>
      }
      input={
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ '& > *': { flex: 1, minWidth: 0 } }}
        >
          <InputPanel
            label={t.left}
            placeholder={leftPlaceholder}
            value={state.input}
            onChange={onLeftChange}
          />
          <InputPanel
            label={t.right}
            placeholder={rightPlaceholder}
            value={state.changed}
            onChange={onRightChange}
            history={false}
          />
        </Stack>
      }
      output={
        <OutputPanel
          label={t.changes}
          value={output}
          placeholder={outputPlaceholder}
          error={
            result && !result.ok
              ? `${t.side(result.side)} · ${j.error(result.error.line, result.error.column, result.error)}`
              : null
          }
          actions={
            result?.ok && (
              <Typography variant="body2" color="text.secondary">
                {t.counts(result.counts.added, result.counts.removed, result.counts.changed)}
              </Typography>
            )
          }
        />
      }
    />
  );
}
