import { useCallback, useMemo, useState, type ChangeEvent } from 'react';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useLocale, useMessages } from '~/i18n/react';
import {
  convertUnix,
  formatUnixOutput,
  timestampUnits,
  unixFields,
  type UnitOption,
  type UnixField,
} from '~/lib/tools/unix';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { ZonePicker } from '../time/ZonePicker';
import { unixMessages } from './messages';

const defaults = { input: '', zone: 'America/Santiago', unit: 'auto', field: 'all' };

function isUnit(value: string): value is UnitOption {
  return value === 'auto' || (timestampUnits as readonly string[]).includes(value);
}

function isField(value: string): value is UnixField | 'all' {
  return value === 'all' || (unixFields as readonly string[]).includes(value);
}

export default function UnixTool() {
  const t = useMessages(unixMessages);
  const locale = useLocale();
  const [state, update] = useUrlState(defaults);
  const [now, setNow] = useState(() => Date.now());
  const unit = isUnit(state.unit) ? state.unit : 'auto';
  const field = isField(state.field) ? state.field : 'all';

  const lines = useMemo(
    () => convertUnix(state.input, { unit, zone: state.zone, now, locale }),
    [state.input, unit, state.zone, now, locale],
  );
  const output = useMemo(
    () => formatUnixOutput(lines, field, state.zone, t),
    [lines, field, state.zone, t],
  );
  const validCount = useMemo(() => lines.filter((line) => line.ok).length, [lines]);

  const onInputChange = useCallback(
    (value: string) => {
      setNow(Date.now());
      update({ input: value });
    },
    [update],
  );

  const onZoneChange = useCallback((zone: string) => update({ zone }), [update]);

  const onUnitChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ unit: event.target.value }),
    [update],
  );

  const onFieldChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ field: event.target.value }),
    [update],
  );

  const onNow = useCallback(() => {
    const current = Date.now();
    setNow(current);
    update({ input: String(Math.floor(current / 1000)) });
  }, [update]);

  return (
    <ToolLayout
      options={
        <>
          <ZonePicker label={t.zone} value={state.zone} onChange={onZoneChange} />
          <TextField select label={t.unit} value={unit} onChange={onUnitChange} sx={{ width: 170 }}>
            <MenuItem value="auto">{t.auto}</MenuItem>
            {timestampUnits.map((value) => (
              <MenuItem key={value} value={value}>
                {t.unitOptions[value]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label={t.show}
            value={field}
            onChange={onFieldChange}
            sx={{ width: 190 }}
          >
            <MenuItem value="all">{t.all}</MenuItem>
            {unixFields.map((value) => (
              <MenuItem key={value} value={value}>
                {t.fields[value]}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="outlined" onClick={onNow}>
            {t.now}
          </Button>
        </>
      }
      input={
        <InputPanel
          label={t.inputLabel}
          placeholder={'1700000000\n1700000000123\n2026-01-15T09:30:00-03:00'}
          value={state.input}
          onChange={onInputChange}
        />
      }
      output={
        <OutputPanel
          value={output}
          actions={
            lines.length ? (
              <Typography variant="body2" color="text.secondary">
                {t.summary(validCount, lines.length)}
              </Typography>
            ) : null
          }
        />
      }
    />
  );
}
