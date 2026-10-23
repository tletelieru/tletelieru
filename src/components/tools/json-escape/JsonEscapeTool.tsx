import { useCallback, useMemo, type ChangeEvent } from 'react';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { locate } from '~/lib/tools/json';
import { escapeJsonString, prettyEmbeddedJson, unescapeJsonString } from '~/lib/tools/json-escape';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { jsonEscapeMessages } from './messages';

type Mode = 'escape' | 'unescape';

const defaults = { mode: 'escape', input: '', quotes: false, ascii: false, pretty: false };

const escapePlaceholder = 'Line 1\n"quoted" é';
const unescapePlaceholder = '"{\\"name\\":\\"caf\\u00e9\\"}"';

function unescapePreview(input: string, pretty: boolean): string | undefined {
  const result = unescapeJsonString(input);
  if (!result.ok) return undefined;
  const embedded = prettyEmbeddedJson(result.text);
  return pretty && embedded !== null ? embedded : result.text;
}

export default function JsonEscapeTool() {
  const t = useMessages(jsonEscapeMessages);
  const [state, update] = useUrlState(defaults);
  const mode: Mode = state.mode === 'unescape' ? 'unescape' : 'escape';

  const unescaped = useMemo(
    () => (mode === 'unescape' && state.input !== '' ? unescapeJsonString(state.input) : null),
    [mode, state.input],
  );

  const embedded = useMemo(
    () => (unescaped?.ok ? prettyEmbeddedJson(unescaped.text) : null),
    [unescaped],
  );

  const output = useMemo(() => {
    if (mode === 'escape') {
      return escapeJsonString(state.input, { quotes: state.quotes, asciiOnly: state.ascii });
    }
    if (!unescaped?.ok) return '';
    return state.pretty && embedded !== null ? embedded : unescaped.text;
  }, [mode, state.input, state.quotes, state.ascii, state.pretty, unescaped, embedded]);

  const outputPlaceholder = useMemo(
    () =>
      mode === 'escape'
        ? escapeJsonString(escapePlaceholder, { quotes: state.quotes, asciiOnly: state.ascii })
        : unescapePreview(unescapePlaceholder, state.pretty),
    [mode, state.quotes, state.ascii, state.pretty],
  );

  const error = useMemo(() => {
    if (!unescaped || unescaped.ok) return null;
    const { code, offset, sequence } = unescaped.error;
    const { line, column } = locate(state.input, offset);
    return t.error(code, sequence, line, column);
  }, [unescaped, state.input, t]);

  const onModeChange = useCallback(
    (_: unknown, value: Mode | null) => {
      if (value) update({ mode: value });
    },
    [update],
  );

  const onQuotesChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ quotes: event.target.checked }),
    [update],
  );

  const onAsciiChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ ascii: event.target.checked }),
    [update],
  );

  const onTogglePretty = useCallback(
    () => update({ pretty: !state.pretty }),
    [update, state.pretty],
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
            <ToggleButton value="escape">{t.escape}</ToggleButton>
            <ToggleButton value="unescape">{t.unescape}</ToggleButton>
          </ToggleButtonGroup>
          {mode === 'escape' && (
            <>
              <FormControlLabel
                control={<Switch checked={state.quotes} onChange={onQuotesChange} />}
                label={t.quotes}
              />
              <FormControlLabel
                control={<Switch checked={state.ascii} onChange={onAsciiChange} />}
                label={t.asciiOnly}
              />
            </>
          )}
        </>
      }
      input={
        <InputPanel
          label={mode === 'unescape' ? t.unescapeInput : t.escapeInput}
          placeholder={mode === 'unescape' ? unescapePlaceholder : escapePlaceholder}
          value={state.input}
          onChange={onInputChange}
        />
      }
      output={
        <OutputPanel
          value={output}
          error={error}
          placeholder={outputPlaceholder}
          actions={
            <>
              {unescaped?.ok && (
                <Typography variant="body2" color="text.secondary">
                  {t.escapes(unescaped.escapes)}
                </Typography>
              )}
              {embedded !== null && (
                <Button
                  size="small"
                  variant="outlined"
                  title={t.embeddedJson}
                  onClick={onTogglePretty}
                >
                  {state.pretty ? t.rawText : t.prettyJson}
                </Button>
              )}
            </>
          }
        />
      }
    />
  );
}
