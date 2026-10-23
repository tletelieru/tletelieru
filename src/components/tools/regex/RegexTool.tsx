import { useCallback, useMemo, type ChangeEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import {
  MAX_MATCHES,
  describeMatches,
  highlightSegments,
  normalizeFlags,
  regexFlags,
  runRegex,
} from '~/lib/tools/regex';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { regexMessages } from './messages';

const defaults = { pattern: '', flags: 'g', input: '', replace: '', risky: false };

const patternPlaceholder = '(?<user>[\\w.+-]+)@(?<domain>[\\w-]+\\.[\\w.]+)';
const placeholder = 'Contact ana@example.com or bob.smith@mail.test.org';

const mono = { fontFamily: 'var(--sl-font-mono, monospace)' };

export default function RegexTool() {
  const t = useMessages(regexMessages);
  const [state, update] = useUrlState(defaults);
  const flags = normalizeFlags(state.flags);
  const replacement = state.replace === '' ? null : state.replace;

  const result = useMemo(
    () =>
      state.input === '' && state.pattern === ''
        ? null
        : runRegex(state.pattern, state.input, {
            flags,
            replacement,
            allowRisky: state.risky,
          }),
    [state.pattern, state.input, flags, replacement, state.risky],
  );

  const run = result?.ok ? result.run : null;

  const outputPlaceholder = useMemo(() => {
    const preview = runRegex(state.pattern || patternPlaceholder, placeholder, {
      flags,
      allowRisky: state.risky,
    });
    return preview.ok ? describeMatches(preview.run.matches) : undefined;
  }, [state.pattern, flags, state.risky]);

  const segments = useMemo(
    () => (run ? highlightSegments(state.input, run.matches) : []),
    [run, state.input],
  );

  const onPatternChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ pattern: event.target.value }),
    [update],
  );

  const onFlagsChange = useCallback(
    (_: unknown, value: string[]) => update({ flags: normalizeFlags(value.join('')) }),
    [update],
  );

  const onReplaceChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ replace: event.target.value }),
    [update],
  );

  const onRiskyChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ risky: event.target.checked }),
    [update],
  );

  const onInputChange = useCallback((input: string) => update({ input }), [update]);

  return (
    <ToolLayout
      options={
        <>
          <TextField
            label={t.pattern}
            placeholder={patternPlaceholder}
            value={state.pattern}
            sx={{ minWidth: 320, flexGrow: 1 }}
            fullWidth={false}
            slotProps={{ htmlInput: { spellCheck: false, style: mono } }}
            onChange={onPatternChange}
          />
          <ToggleButtonGroup
            size="small"
            value={[...flags]}
            onChange={onFlagsChange}
            aria-label={t.flags}
          >
            {regexFlags.map((flag) => (
              <ToggleButton key={flag} value={flag} aria-label={`${flag} (${t.flagNames[flag]})`}>
                {flag}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <TextField
            label={t.replacement}
            placeholder="$<user> at $<domain>"
            value={state.replace}
            sx={{ minWidth: 240 }}
            fullWidth={false}
            slotProps={{ htmlInput: { spellCheck: false, style: mono } }}
            onChange={onReplaceChange}
          />
          <FormControlLabel
            control={<Switch checked={state.risky} onChange={onRiskyChange} />}
            label={t.allowRisky}
          />
        </>
      }
      input={
        <InputPanel
          label={t.text}
          placeholder={placeholder}
          value={state.input}
          onChange={onInputChange}
          actions={
            run && (
              <Typography variant="body2" color="text.secondary">
                {t.matches(run.matches.length)}
              </Typography>
            )
          }
        />
      }
      output={
        <Stack spacing={2}>
          {run?.truncated && <Alert severity="info">{t.truncated(MAX_MATCHES)}</Alert>}
          {run?.timedOut && <Alert severity="warning">{t.timedOut}</Alert>}
          {segments.length > 0 && run && run.matches.length > 0 && (
            <Stack spacing={1}>
              <Typography variant="subtitle2">{t.highlight}</Typography>
              <Paper
                variant="outlined"
                aria-label={t.highlight}
                sx={{ p: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', ...mono }}
              >
                {segments.map((segment, index) =>
                  segment.match === null ? (
                    <span key={index}>{segment.text}</span>
                  ) : (
                    <Box
                      key={index}
                      component="mark"
                      title={`#${segment.match + 1}`}
                      sx={{
                        bgcolor: segment.match % 2 ? 'warning.light' : 'info.light',
                        color: 'common.black',
                        borderRadius: 0.5,
                      }}
                    >
                      {segment.text}
                    </Box>
                  ),
                )}
              </Paper>
            </Stack>
          )}
          <OutputPanel
            label={t.matchesLabel}
            value={run ? describeMatches(run.matches) : ''}
            error={result && !result.ok ? t.error(result.error) : null}
            placeholder={outputPlaceholder}
          />
          {replacement !== null && (
            <OutputPanel label={t.replacePreview} value={run?.replaced ?? ''} snippet={false} />
          )}
        </Stack>
      }
    />
  );
}
