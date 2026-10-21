import { useCallback, useMemo } from 'react';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import {
  decodeHtmlEntities,
  encodeHtmlEntities,
  htmlEncodeFormats,
  htmlEncodeScopes,
  isHtmlEncodeFormat,
  isHtmlEncodeScope,
  type HtmlEncodeFormat,
  type HtmlEncodeScope,
} from '~/lib/tools/html-entities';
import { locate } from '~/lib/tools/json';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { htmlEntitiesMessages } from './messages';

type Mode = 'encode' | 'decode';

const defaults = { mode: 'encode', input: '', scope: 'minimal', format: 'named' };

const MAX_ISSUES = 20;

export default function HtmlEntitiesTool() {
  const t = useMessages(htmlEntitiesMessages);
  const [state, update] = useUrlState(defaults);
  const mode: Mode = state.mode === 'decode' ? 'decode' : 'encode';
  const scope: HtmlEncodeScope = isHtmlEncodeScope(state.scope) ? state.scope : 'minimal';
  const format: HtmlEncodeFormat = isHtmlEncodeFormat(state.format) ? state.format : 'named';

  const decoded = useMemo(
    () => (mode === 'decode' ? decodeHtmlEntities(state.input) : null),
    [mode, state.input],
  );

  const output = useMemo(
    () => decoded?.output ?? encodeHtmlEntities(state.input, { scope, format }),
    [decoded, state.input, scope, format],
  );

  const issues = useMemo(
    () =>
      (decoded?.issues ?? []).slice(0, MAX_ISSUES).map((issue) => {
        const { line, column } = locate(state.input, issue.offset);
        return {
          key: `${issue.offset}-${issue.code}`,
          text: t.issue(issue.code, issue.entity, line, column),
        };
      }),
    [decoded, state.input, t],
  );

  const onModeChange = useCallback(
    (_: unknown, value: Mode | null) => {
      if (value) update({ mode: value });
    },
    [update],
  );

  const onScopeChange = useCallback(
    (_: unknown, value: HtmlEncodeScope | null) => {
      if (value) update({ scope: value });
    },
    [update],
  );

  const onFormatChange = useCallback(
    (_: unknown, value: HtmlEncodeFormat | null) => {
      if (value) update({ format: value });
    },
    [update],
  );

  const onInputChange = useCallback((input: string) => update({ input }), [update]);

  const issueCount = decoded?.issues.length ?? 0;

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
            <ToggleButton value="encode">{t.encode}</ToggleButton>
            <ToggleButton value="decode">{t.decode}</ToggleButton>
          </ToggleButtonGroup>
          {mode === 'encode' && (
            <>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={scope}
                onChange={onScopeChange}
                aria-label={t.scope}
              >
                {htmlEncodeScopes.map((option) => (
                  <ToggleButton key={option} value={option} sx={{ textTransform: 'none' }}>
                    {t.scopes[option]}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={format}
                onChange={onFormatChange}
                aria-label={t.format}
              >
                {htmlEncodeFormats.map((option) => (
                  <ToggleButton key={option} value={option}>
                    {t.formats[option]}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </>
          )}
        </>
      }
      input={
        <InputPanel
          label={mode === 'decode' ? t.decodeInput : t.encodeInput}
          placeholder={mode === 'decode' ? 'caf&eacute; &amp; &#x1F600;' : '<p>Café & "tea"</p>'}
          value={state.input}
          onChange={onInputChange}
        />
      }
      output={
        <>
          <OutputPanel
            value={output}
            actions={
              decoded !== null &&
              state.input !== '' && (
                <Typography variant="body2" color="text.secondary">
                  {t.decodedCount(decoded.decoded)}
                </Typography>
              )
            }
          />
          {issueCount > 0 && (
            <Alert severity="warning">
              <AlertTitle>{t.issuesTitle(issueCount)}</AlertTitle>
              {issues.map((issue) => (
                <div key={issue.key}>{issue.text}</div>
              ))}
            </Alert>
          )}
        </>
      }
    />
  );
}
