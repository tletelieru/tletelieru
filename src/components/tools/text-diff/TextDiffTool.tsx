import { useCallback, useMemo, type ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { pickOption } from '~/lib/tools/sql/format';
import {
  diffText,
  diffViews,
  splitRows,
  unifiedDiff,
  type DiffLine,
  type DiffLineKind,
} from '~/lib/tools/text-diff';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { textDiffMessages } from './messages';

const defaults = { input: '', changed: '', view: 'split', ws: false, case: false };

const leftPlaceholder = 'apple\nbanana\ncherry\ndate';
const rightPlaceholder = 'apple\nblueberry\ncherry\ndate\nelderberry';

const tones: Record<DiffLineKind, string> = {
  same: 'transparent',
  added: 'rgba(46, 160, 67, 0.18)',
  removed: 'rgba(248, 81, 73, 0.18)',
};

const signs: Record<DiffLineKind, string> = { same: ' ', added: '+', removed: '-' };

const cell = {
  fontFamily: 'var(--sl-font-mono, monospace)',
  fontSize: '0.85rem',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  px: 1,
  py: 0.25,
} as const;

function LineCell({ line, number }: { line: DiffLine | null; number: number | null }) {
  return (
    <>
      <Box sx={{ ...cell, color: 'text.secondary', textAlign: 'right', userSelect: 'none' }}>
        {number ?? ''}
      </Box>
      <Box
        data-kind={line?.kind ?? 'empty'}
        sx={{ ...cell, bgcolor: line ? tones[line.kind] : 'action.hover' }}
      >
        {line ? `${signs[line.kind]} ${line.text}` : ''}
      </Box>
    </>
  );
}

export default function TextDiffTool() {
  const t = useMessages(textDiffMessages);
  const [state, update] = useUrlState(defaults);
  const view = pickOption(state.view, diffViews, 'split');
  const options = useMemo(
    () => ({ ignoreWhitespace: state.ws, ignoreCase: state.case }),
    [state.ws, state.case],
  );
  const active = state.input !== '' || state.changed !== '';

  const result = useMemo(
    () => diffText(state.input, state.changed, options),
    [state.input, state.changed, options],
  );

  const patch = useMemo(() => (active ? unifiedDiff(result.lines) : ''), [active, result.lines]);

  const outputPlaceholder = useMemo(
    () => unifiedDiff(diffText(leftPlaceholder, rightPlaceholder, options).lines),
    [options],
  );

  const rows = useMemo(() => splitRows(result.lines), [result.lines]);

  const onViewChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ view: value });
    },
    [update],
  );

  const onWsChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ ws: event.target.checked }),
    [update],
  );

  const onCaseChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ case: event.target.checked }),
    [update],
  );

  const onLeftChange = useCallback((input: string) => update({ input }), [update]);
  const onRightChange = useCallback((changed: string) => update({ changed }), [update]);

  return (
    <ToolLayout
      options={
        <>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={view}
            onChange={onViewChange}
            aria-label={t.view}
          >
            <ToggleButton value="split">{t.split}</ToggleButton>
            <ToggleButton value="unified">{t.unified}</ToggleButton>
          </ToggleButtonGroup>
          <FormControlLabel
            control={<Switch checked={state.ws} onChange={onWsChange} />}
            label={t.ignoreWhitespace}
          />
          <FormControlLabel
            control={<Switch checked={state.case} onChange={onCaseChange} />}
            label={t.ignoreCase}
          />
        </>
      }
      input={
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ '& > *': { flex: 1, minWidth: 0 } }}
        >
          <InputPanel
            label={t.original}
            placeholder={leftPlaceholder}
            value={state.input}
            onChange={onLeftChange}
          />
          <InputPanel
            label={t.changed}
            placeholder={rightPlaceholder}
            value={state.changed}
            onChange={onRightChange}
            history={false}
          />
        </Stack>
      }
      output={
        <Stack spacing={2}>
          {active && (
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                  {t.visual}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {result.identical ? t.identical : t.counts(result.added, result.removed)}
                </Typography>
              </Stack>
              <Paper variant="outlined" aria-label={t.visual} sx={{ overflowX: 'auto' }}>
                {view === 'split' ? (
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr' }}>
                    {rows.map((row, index) => (
                      <Box key={index} sx={{ display: 'contents' }}>
                        <LineCell line={row.left} number={row.left?.oldLine ?? null} />
                        <LineCell line={row.right} number={row.right?.newLine ?? null} />
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr' }}>
                    {result.lines.map((line, index) => (
                      <Box key={index} sx={{ display: 'contents' }}>
                        <Box sx={{ ...cell, color: 'text.secondary', textAlign: 'right' }}>
                          {line.oldLine ?? ''}
                        </Box>
                        <LineCell line={line} number={line.newLine} />
                      </Box>
                    ))}
                  </Box>
                )}
              </Paper>
            </Stack>
          )}
          <OutputPanel label={t.patch} value={patch} placeholder={outputPlaceholder} />
        </Stack>
      }
    />
  );
}
