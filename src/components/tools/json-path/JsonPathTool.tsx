import { useCallback, useMemo, type ChangeEvent } from 'react';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import {
  jsonPathViews,
  queryJsonPath,
  renderMatches,
  type JsonPathError,
} from '~/lib/tools/json-path';
import { pickOption } from '~/lib/tools/sql/format';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { jsonMessages } from '../json/messages';
import { jsonPathMessages } from './messages';

const defaults = { input: '', path: '', view: 'values' };

const pathPlaceholder = '$.store.book[?(@.price < 10)].title';
const placeholder =
  '{"store": {"book": [{"title": "Sayings", "price": 8.95}, {"title": "Sword", "price": 12.99}, {"title": "Moby Dick", "price": 8.99}]}}';

export default function JsonPathTool() {
  const t = useMessages(jsonPathMessages);
  const j = useMessages(jsonMessages);
  const [state, update] = useUrlState(defaults);
  const view = pickOption(state.view, jsonPathViews, 'values');

  const result = useMemo(
    () => (state.input.trim() ? queryJsonPath(state.input, state.path) : null),
    [state.input, state.path],
  );

  const outputPlaceholder = useMemo(() => {
    const preview = queryJsonPath(placeholder, state.path || pathPlaceholder);
    return preview.ok ? renderMatches(preview.matches, view) : undefined;
  }, [state.path, view]);

  const describeError = useCallback(
    (error: JsonPathError): string => {
      if (error.code === 'invalidJson') {
        return j.error(error.error.line, error.error.column, error.error);
      }
      if (error.code === 'pathRequired') return t.pathRequired;
      return t.syntax(error);
    },
    [j, t],
  );

  const output = useMemo(() => {
    if (!result) return '';
    if (result.ok) return renderMatches(result.matches, view);
    return result.error.code === 'invalidJson' ? result.error.error.excerpt : '';
  }, [result, view]);

  const onPathChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ path: event.target.value }),
    [update],
  );

  const onViewChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ view: value });
    },
    [update],
  );

  const onInputChange = useCallback((input: string) => update({ input }), [update]);

  return (
    <ToolLayout
      options={
        <>
          <TextField
            label={t.path}
            placeholder={pathPlaceholder}
            value={state.path}
            sx={{ minWidth: 320, flexGrow: 1 }}
            fullWidth={false}
            slotProps={{ htmlInput: { spellCheck: false } }}
            onChange={onPathChange}
          />
          <ToggleButtonGroup
            exclusive
            size="small"
            value={view}
            onChange={onViewChange}
            aria-label={t.view}
          >
            <ToggleButton value="values">{t.values}</ToggleButton>
            <ToggleButton value="paths">{t.paths}</ToggleButton>
            <ToggleButton value="pointers">{t.pointers}</ToggleButton>
          </ToggleButtonGroup>
        </>
      }
      input={
        <InputPanel
          label="JSON"
          placeholder={placeholder}
          value={state.input}
          onChange={onInputChange}
        />
      }
      output={
        <OutputPanel
          value={output}
          error={result && !result.ok ? describeError(result.error) : null}
          placeholder={outputPlaceholder}
          actions={
            result?.ok && (
              <Typography variant="body2" color="text.secondary">
                {t.matches(result.matches.length)}
              </Typography>
            )
          }
        />
      }
    />
  );
}
