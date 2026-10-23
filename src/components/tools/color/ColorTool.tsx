import { useCallback, useMemo, type ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { contrast, describeColor, parseColor, toRgbString, type Rgba } from '~/lib/tools/color';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { colorMessages } from './messages';

const defaults = { input: '', bg: '#ffffff' };

const placeholder = '#336699';

const checker = 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 16px 16px';

function Swatch({ color, label }: { color: Rgba; label: string }) {
  return (
    <Box
      role="img"
      aria-label={label}
      sx={{
        width: 96,
        height: 64,
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        background: checker,
      }}
    >
      <Box sx={{ width: '100%', height: '100%', borderRadius: 1, bgcolor: toRgbString(color) }} />
    </Box>
  );
}

export default function ColorTool() {
  const t = useMessages(colorMessages);
  const [state, update] = useUrlState(defaults);

  const parsed = useMemo(
    () => (state.input.trim() ? parseColor(state.input) : null),
    [state.input],
  );
  const background = useMemo(() => parseColor(state.bg), [state.bg]);
  const preview = useMemo(() => parseColor(placeholder), []);
  const color = parsed?.ok ? parsed.color : null;
  const shown = color ?? (preview.ok ? preview.color : null);

  const report = useMemo(
    () => (shown && background.ok ? contrast(shown, background.color) : null),
    [shown, background],
  );

  const outputPlaceholder = useMemo(
    () => (preview.ok ? describeColor(preview.color) : undefined),
    [preview],
  );

  const error = useMemo(() => {
    if (parsed && !parsed.ok) return t.error(parsed.error, t.color);
    if (!background.ok) return t.error(background.error, t.background);
    return null;
  }, [parsed, background, t]);

  const onBackgroundChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ bg: event.target.value }),
    [update],
  );

  const onInputChange = useCallback((input: string) => update({ input }), [update]);

  const verdict = (passed: boolean) => (
    <Chip size="small" color={passed ? 'success' : 'error'} label={passed ? t.pass : t.fail} />
  );

  return (
    <ToolLayout
      options={
        <TextField
          label={t.background}
          value={state.bg}
          sx={{ width: 220 }}
          fullWidth={false}
          onChange={onBackgroundChange}
        />
      }
      input={
        <InputPanel
          label={t.color}
          placeholder={placeholder}
          value={state.input}
          onChange={onInputChange}
          minRows={1}
        />
      }
      output={
        <Stack spacing={2}>
          {shown && (
            <Stack
              direction="row"
              spacing={2}
              useFlexGap
              sx={{ flexWrap: 'wrap', alignItems: 'center' }}
            >
              <Swatch color={shown} label={t.swatch} />
              {background.ok && report && (
                <Box
                  aria-label={t.preview}
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: toRgbString(background.color),
                    color: toRgbString(shown),
                  }}
                >
                  <Typography sx={{ fontSize: '1.5rem', fontWeight: 700 }}>{t.sample}</Typography>
                  <Typography>{t.sample}</Typography>
                </Box>
              )}
              {report && (
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2">{t.ratio(report.ratio)}</Typography>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography variant="body2">{t.normal}</Typography>
                    <span>AA</span>
                    {verdict(report.aa)}
                    <span>AAA</span>
                    {verdict(report.aaa)}
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography variant="body2">{t.large}</Typography>
                    <span>AA</span>
                    {verdict(report.aaLarge)}
                    <span>AAA</span>
                    {verdict(report.aaaLarge)}
                  </Stack>
                </Stack>
              )}
            </Stack>
          )}
          <OutputPanel
            value={color ? describeColor(color) : ''}
            error={error}
            placeholder={outputPlaceholder}
          />
        </Stack>
      }
    />
  );
}
