import { useCallback, useMemo, useState, type ChangeEvent } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useLocale, useMessages } from '~/i18n/react';
import { useHydrated } from '~/lib/hydration';
import { clampInt } from '~/lib/tools/_shared/lines';
import { MAX_RUNS, describeCron, formatRun, nextRuns, parseCron } from '~/lib/tools/cron';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { ZonePicker } from '../time/ZonePicker';
import { cronMessages } from './messages';

const defaults = { input: '', zone: 'America/Santiago', count: 5 };

const placeholder = '*/15 9-18 * * 1-5';

export default function CronTool() {
  const t = useMessages(cronMessages);
  const locale = useLocale();
  const hydrated = useHydrated();
  const [now, setNow] = useState(() => Date.now());
  const [state, update] = useUrlState(defaults);
  const count = clampInt(state.count, 1, MAX_RUNS);
  const expression = state.input.trim() ? state.input : '';

  const parsed = useMemo(
    () => (expression ? parseCron(expression, state.zone) : null),
    [expression, state.zone],
  );

  const evaluate = useCallback(
    (source: string) => {
      const result = parseCron(source, state.zone);
      if (!result.ok) return null;
      const description = describeCron(result.info.expression, locale);
      const runs = hydrated
        ? nextRuns(result.info.expression, state.zone, new Date(now), count).map((date) =>
            formatRun(date, state.zone, locale),
          )
        : [];
      return { description, runs, info: result.info };
    },
    [state.zone, locale, hydrated, now, count],
  );

  const view = useMemo(
    () => (parsed?.ok ? evaluate(expression) : null),
    [parsed, evaluate, expression],
  );

  const outputPlaceholder = useMemo(() => {
    const preview = evaluate(placeholder);
    return preview ? [preview.description, '', ...preview.runs].join('\n').trim() : undefined;
  }, [evaluate]);

  const onZoneChange = useCallback(
    (zone: string) => {
      setNow(Date.now());
      update({ zone });
    },
    [update],
  );

  const onCountChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ count: clampInt(Number(event.target.value), 1, MAX_RUNS) }),
    [update],
  );

  const onNow = useCallback(() => setNow(Date.now()), []);

  const onInputChange = useCallback(
    (input: string) => {
      setNow(Date.now());
      update({ input });
    },
    [update],
  );

  return (
    <ToolLayout
      options={
        <>
          <ZonePicker label={t.zone} value={state.zone} onChange={onZoneChange} />
          <TextField
            type="number"
            label={t.count}
            value={count}
            sx={{ width: 160 }}
            fullWidth={false}
            slotProps={{ htmlInput: { min: 1, max: MAX_RUNS } }}
            onChange={onCountChange}
          />
          <Button variant="outlined" size="small" onClick={onNow}>
            {t.now}
          </Button>
        </>
      }
      input={
        <InputPanel
          label={t.expression}
          placeholder={placeholder}
          value={state.input}
          onChange={onInputChange}
          minRows={1}
          actions={
            view && (
              <Typography variant="body2" color="text.secondary">
                {view.info.seconds ? t.withSeconds : t.standard}
              </Typography>
            )
          }
        />
      }
      output={
        <>
          {view && view.description !== '' && (
            <Alert severity="info" icon={false} role="note">
              <Typography variant="h6" component="p">
                {view.description}
              </Typography>
            </Alert>
          )}
          <OutputPanel
            label={t.runsLabel}
            value={view ? [view.description, '', ...view.runs].join('\n').trim() : ''}
            error={parsed && !parsed.ok ? t.error(parsed.error) : null}
            placeholder={outputPlaceholder}
          />
        </>
      }
    />
  );
}
