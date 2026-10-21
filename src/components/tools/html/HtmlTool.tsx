import { useCallback, useMemo, type ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import {
  backgroundColors,
  buildSrcDoc,
  sandboxFor,
  viewportWidth,
  type HtmlBackground,
  type HtmlViewport,
} from '~/lib/tools/html';
import { clampInt } from '~/lib/tools/_shared/lines';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { CopyButton } from '../_shared/CopyButton';
import { ToolLayout } from '../_shared/ToolLayout';
import { htmlMessages } from './messages';

const defaults = {
  input: '',
  viewport: 'desktop',
  background: 'light',
  scripts: false,
  height: 400,
};

const viewports: HtmlViewport[] = ['mobile', 'tablet', 'desktop'];
const backgrounds: HtmlBackground[] = ['light', 'dark'];

export default function HtmlTool() {
  const t = useMessages(htmlMessages);
  const [state, update] = useUrlState(defaults);
  const viewport: HtmlViewport = viewports.includes(state.viewport as HtmlViewport)
    ? (state.viewport as HtmlViewport)
    : 'desktop';
  const background: HtmlBackground = backgrounds.includes(state.background as HtmlBackground)
    ? (state.background as HtmlBackground)
    : 'light';
  const height = clampInt(state.height, 100, 4000);
  const sandbox = sandboxFor(state.scripts);

  const srcDoc = useMemo(
    () => buildSrcDoc(state.input, { allowScripts: state.scripts, background }),
    [state.input, state.scripts, background],
  );

  const onViewportChange = useCallback(
    (_: unknown, value: HtmlViewport | null) => {
      if (value) update({ viewport: value });
    },
    [update],
  );

  const onBackgroundChange = useCallback(
    (_: unknown, value: HtmlBackground | null) => {
      if (value) update({ background: value });
    },
    [update],
  );

  const onScriptsChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ scripts: event.target.checked }),
    [update],
  );

  const onHeightChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ height: clampInt(Number(event.target.value), 100, 4000) }),
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
            value={viewport}
            onChange={onViewportChange}
            aria-label={t.viewport}
          >
            <ToggleButton value="mobile">{t.mobile}</ToggleButton>
            <ToggleButton value="tablet">{t.tablet}</ToggleButton>
            <ToggleButton value="desktop">{t.desktop}</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={background}
            onChange={onBackgroundChange}
            aria-label={t.background}
          >
            <ToggleButton value="light">{t.light}</ToggleButton>
            <ToggleButton value="dark">{t.dark}</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            type="number"
            label={t.height}
            value={height}
            sx={{ width: 130 }}
            fullWidth={false}
            slotProps={{ htmlInput: { min: 100, max: 4000, step: 50 } }}
            onChange={onHeightChange}
          />
          <FormControlLabel
            control={<Switch checked={state.scripts} onChange={onScriptsChange} />}
            label={t.allowScripts}
          />
        </>
      }
      input={
        <InputPanel
          label={t.inputLabel}
          placeholder={t.placeholder}
          value={state.input}
          onChange={onInputChange}
        />
      }
      output={
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
              {t.preview}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {state.scripts ? t.scriptsAllowed : t.scriptsBlocked}
            </Typography>
            <CopyButton text={state.input ? srcDoc : ''} label={t.copyDocument} />
          </Stack>
          <Box
            sx={{
              p: 1,
              borderRadius: 1,
              border: 1,
              borderColor: 'divider',
              bgcolor: backgroundColors[background].background,
              overflowX: 'auto',
            }}
          >
            <Box
              component="iframe"
              key={sandbox}
              title={t.preview}
              sandbox={sandbox}
              srcDoc={srcDoc}
              sx={{
                display: 'block',
                width: viewportWidth(viewport),
                maxWidth: viewport === 'desktop' ? '100%' : 'none',
                height,
                mx: 'auto',
                border: 0,
                bgcolor: backgroundColors[background].background,
              }}
            />
          </Box>
        </Stack>
      }
    />
  );
}
