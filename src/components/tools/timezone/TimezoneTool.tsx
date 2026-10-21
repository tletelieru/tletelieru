import { useCallback, useMemo, type ChangeEvent } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useMessages } from '~/i18n/react';
import {
  convertTimeZones,
  formatConversion,
  joinZoneList,
  nowInZone,
  parseZoneList,
  swapZones,
  type TimezoneConversion,
} from '~/lib/tools/timezone';
import { useUrlState } from '~/lib/url-state';
import { OutputPanel } from '../_shared/OutputPanel';
import { PasteButton } from '../_shared/PasteButton';
import { ToolLayout } from '../_shared/ToolLayout';
import { ZoneMultiPicker, ZonePicker } from '../time/ZonePicker';
import { timezoneMessages } from './messages';

type TimezoneMessages = (typeof timezoneMessages)['en'];

const defaults = { input: '', from: 'America/Santiago', to: 'UTC' };

function errorMessage(result: TimezoneConversion, t: TimezoneMessages): string | null {
  if (result.status === 'invalid-input') return t.invalidInput;
  if (result.status === 'invalid-zone') return t.invalidZone(result.zone);
  if (result.status === 'gap') {
    return t.gap(
      result.local,
      result.zone,
      result.jumpFrom,
      result.offsetBefore,
      result.jumpTo,
      result.offsetAfter,
      `${result.suggestion.local} (${result.suggestion.offset})`,
    );
  }
  return null;
}

function noteMessage(result: TimezoneConversion, t: TimezoneMessages): string | null {
  if (result.status !== 'ok') return null;
  if (result.kind === 'explicit-offset') return t.explicitOffset(result.offset);
  if (result.kind === 'ambiguous') return t.ambiguous(result.local, result.zone);
  return null;
}

export default function TimezoneTool() {
  const t = useMessages(timezoneMessages);
  const [state, update] = useUrlState(defaults);
  const targets = useMemo(() => parseZoneList(state.to), [state.to]);

  const result = useMemo(
    () => convertTimeZones(state.input, state.from, targets),
    [state.input, state.from, targets],
  );
  const output = useMemo(() => formatConversion(result, t), [result, t]);
  const error = useMemo(() => errorMessage(result, t), [result, t]);
  const note = useMemo(() => noteMessage(result, t), [result, t]);

  const onInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ input: event.target.value }),
    [update],
  );

  const onFromChange = useCallback((zone: string) => update({ from: zone }), [update]);

  const onTargetsChange = useCallback(
    (zones: string[]) => update({ to: joinZoneList(zones) }),
    [update],
  );

  const onSwap = useCallback(() => {
    const swapped = swapZones(state.input, state.from, targets);
    update({ input: swapped.input, from: swapped.source, to: joinZoneList(swapped.targets) });
  }, [state.input, state.from, targets, update]);

  const onPaste = useCallback((text: string) => update({ input: text.trim() }), [update]);

  const onNow = useCallback(
    () => update({ input: nowInZone(Date.now(), state.from) }),
    [state.from, update],
  );

  return (
    <ToolLayout
      options={
        <>
          <ZonePicker label={t.from} value={state.from} onChange={onFromChange} />
          <Button variant="outlined" onClick={onSwap} disabled={!targets.length}>
            {t.swap}
          </Button>
          <ZoneMultiPicker label={t.to} value={targets} onChange={onTargetsChange} />
        </>
      }
      input={
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <TextField
            label={t.inputLabel}
            placeholder="2026-01-15 09:30"
            helperText={t.inputHelp}
            value={state.input}
            onChange={onInputChange}
            sx={{ flexGrow: 1 }}
            slotProps={{
              htmlInput: {
                spellCheck: false,
                style: { fontFamily: 'var(--sl-font-mono, ui-monospace, monospace)' },
              },
            }}
          />
          <Button variant="outlined" onClick={onNow} sx={{ mt: 1 }}>
            {t.now}
          </Button>
          <Stack sx={{ mt: 1.25 }}>
            <PasteButton onPaste={onPaste} />
          </Stack>
        </Stack>
      }
      output={
        <Stack spacing={1}>
          {note && (
            <Alert
              severity={result.status === 'ok' && result.kind === 'ambiguous' ? 'warning' : 'info'}
            >
              {note}
            </Alert>
          )}
          <OutputPanel value={output} error={error} />
        </Stack>
      }
    />
  );
}
