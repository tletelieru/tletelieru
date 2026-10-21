import { useCallback, type ChangeEvent } from 'react';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { clampInt } from '~/lib/tools/_shared/lines';
import { MAX_BATCH, type SqlOptionState } from '~/lib/tools/sql/format';
import type { ValueStats } from '~/lib/tools/sql/values';
import { sqlMessages } from './messages';

interface SqlOptionsProps {
  state: SqlOptionState;
  update: (patch: Partial<SqlOptionState>) => void;
  quoteStyle?: boolean;
  escape?: boolean;
  layout?: boolean;
  batch?: boolean;
}

export function SqlOptions({
  state,
  update,
  quoteStyle = true,
  escape = true,
  layout = true,
  batch = true,
}: SqlOptionsProps) {
  const t = useMessages(sqlMessages);
  const onSeparatorChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ sep: value });
    },
    [update],
  );

  const onQuoteChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ quote: value });
    },
    [update],
  );

  const onLayoutChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ layout: value });
    },
    [update],
  );

  const onDedupeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ dedupe: event.target.checked }),
    [update],
  );

  const onStripChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ strip: event.target.checked }),
    [update],
  );

  const onEscapeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ escape: event.target.checked }),
    [update],
  );

  const onUpperChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ upper: event.target.checked }),
    [update],
  );

  const onBatchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ batch: clampInt(Number(event.target.value), 0, MAX_BATCH) }),
    [update],
  );

  return (
    <>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={state.sep}
        onChange={onSeparatorChange}
        aria-label={t.splitOn}
      >
        <ToggleButton value="any">{t.anySeparator}</ToggleButton>
        <ToggleButton value="newline">{t.newlinesOnly}</ToggleButton>
      </ToggleButtonGroup>
      {quoteStyle ? (
        <ToggleButtonGroup
          exclusive
          size="small"
          value={state.quote}
          onChange={onQuoteChange}
          aria-label={t.quoteStyle}
        >
          <ToggleButton value="single" aria-label={t.singleQuotes}>
            &apos;
          </ToggleButton>
          <ToggleButton value="double" aria-label={t.doubleQuotes}>
            &quot;
          </ToggleButton>
          <ToggleButton value="backtick" aria-label={t.backticks}>
            `
          </ToggleButton>
          <ToggleButton value="none" aria-label={t.noQuotes}>
            {t.none}
          </ToggleButton>
        </ToggleButtonGroup>
      ) : null}
      {layout ? (
        <ToggleButtonGroup
          exclusive
          size="small"
          value={state.layout}
          onChange={onLayoutChange}
          aria-label={t.layout}
        >
          <ToggleButton value="single">{t.singleLine}</ToggleButton>
          <ToggleButton value="multi">{t.onePerLine}</ToggleButton>
        </ToggleButtonGroup>
      ) : null}
      {batch ? (
        <TextField
          type="number"
          label={t.batchSize}
          value={state.batch}
          sx={{ width: 180 }}
          fullWidth={false}
          slotProps={{ htmlInput: { min: 0, max: MAX_BATCH } }}
          onChange={onBatchChange}
        />
      ) : null}
      <FormControlLabel
        control={<Switch checked={state.dedupe} onChange={onDedupeChange} />}
        label={t.removeDuplicates}
      />
      <FormControlLabel
        control={<Switch checked={state.strip} onChange={onStripChange} />}
        label={t.stripQuotes}
      />
      {escape ? (
        <FormControlLabel
          control={<Switch checked={state.escape} onChange={onEscapeChange} />}
          label={t.escapeQuotes}
        />
      ) : null}
      <FormControlLabel
        control={<Switch checked={state.upper} onChange={onUpperChange} />}
        label={t.uppercase}
      />
    </>
  );
}

export function ValueStatsText({ stats }: { stats: ValueStats }) {
  const t = useMessages(sqlMessages);
  if (!stats.total) return null;
  return (
    <Typography variant="body2" color="text.secondary">
      {t.stats(stats)}
    </Typography>
  );
}
