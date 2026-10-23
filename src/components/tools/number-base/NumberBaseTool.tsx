import { useCallback, useMemo } from 'react';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useMessages } from '~/i18n/react';
import {
  bitWidths,
  convertBytes,
  formatAmount,
  groupDigits,
  inputBases,
  parseByteSize,
  parseNumber,
  toBase,
  twosComplement,
} from '~/lib/tools/number-base';
import { pickOption } from '~/lib/tools/sql/format';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { numberBaseMessages } from './messages';

type Messages = (typeof numberBaseMessages)['en'];

const defaults = { mode: 'base', input: '', base: 'auto', width: '32' };

const placeholders = { base: '0xff', bytes: '1.5 GiB' };

function pad(rows: [string, string][]): string {
  const width = rows.reduce((max, [label]) => Math.max(max, label.length), 0);
  return rows.map(([label, value]) => `${label.padEnd(width)}  ${value}`).join('\n');
}

function describeNumber(input: string, base: string, width: number, t: Messages) {
  const parsed = parseNumber(input, pickOption(base, inputBases, 'auto'));
  if (!parsed.ok) return { output: '', error: t.numberError(parsed.error) };
  const { value } = parsed.number;
  const twos = twosComplement(value, width);
  const rows: [string, string][] = [
    ['bin', groupDigits(toBase(value, 2), 4)],
    ['oct', toBase(value, 8)],
    ['dec', groupDigits(toBase(value, 10), 3, ',')],
    ['hex', toBase(value, 16)],
    ['base36', toBase(value, 36)],
  ];
  const twosRows: [string, string][] = twos.fits
    ? [
        ['bin', groupDigits(twos.binary, 4)],
        ['hex', `0x${twos.hex}`],
        [t.signed, twos.signed.toString()],
        [t.unsigned, twos.unsigned.toString()],
      ]
    : [];
  const twosBlock = twos.fits ? pad(twosRows) : t.doesNotFit(width);
  return { output: `${pad(rows)}\n\n${t.twos(width)}\n${twosBlock}`, error: null };
}

function describeBytes(input: string, t: Messages) {
  const parsed = parseByteSize(input);
  if (!parsed.ok) return { output: '', error: t.bytesError(parsed.error) };
  return {
    output: pad(convertBytes(parsed.bytes).map(({ unit, value }) => [unit, formatAmount(value)])),
    error: null,
  };
}

export default function NumberBaseTool() {
  const t = useMessages(numberBaseMessages);
  const [state, update] = useUrlState(defaults);
  const mode = state.mode === 'bytes' ? 'bytes' : 'base';
  const width = Number(pickOption(state.width, bitWidths, '32'));
  const placeholder = placeholders[mode];

  const describe = useCallback(
    (input: string) =>
      mode === 'bytes' ? describeBytes(input, t) : describeNumber(input, state.base, width, t),
    [mode, state.base, width, t],
  );

  const result = useMemo(
    () => (state.input.trim() ? describe(state.input) : { output: '', error: null }),
    [describe, state.input],
  );

  const outputPlaceholder = useMemo(() => describe(placeholder).output, [describe, placeholder]);

  const onModeChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ mode: value });
    },
    [update],
  );

  const onBaseChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ base: value });
    },
    [update],
  );

  const onWidthChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ width: value });
    },
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
            value={mode}
            onChange={onModeChange}
            aria-label={t.mode}
          >
            <ToggleButton value="base">{t.bases}</ToggleButton>
            <ToggleButton value="bytes">{t.bytes}</ToggleButton>
          </ToggleButtonGroup>
          {mode === 'base' && (
            <ToggleButtonGroup
              exclusive
              size="small"
              value={pickOption(state.base, inputBases, 'auto')}
              onChange={onBaseChange}
              aria-label={t.inputBase}
            >
              <ToggleButton value="auto">{t.auto}</ToggleButton>
              <ToggleButton value="2">2</ToggleButton>
              <ToggleButton value="8">8</ToggleButton>
              <ToggleButton value="10">10</ToggleButton>
              <ToggleButton value="16">16</ToggleButton>
              <ToggleButton value="36">36</ToggleButton>
            </ToggleButtonGroup>
          )}
          {mode === 'base' && (
            <ToggleButtonGroup
              exclusive
              size="small"
              value={String(width)}
              onChange={onWidthChange}
              aria-label={t.width}
            >
              {bitWidths.map((bits) => (
                <ToggleButton key={bits} value={bits}>
                  {t.bits(bits)}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
        </>
      }
      input={
        <InputPanel
          label={mode === 'bytes' ? t.size : t.number}
          placeholder={placeholder}
          value={state.input}
          onChange={onInputChange}
          minRows={1}
        />
      }
      output={
        <OutputPanel value={result.output} error={result.error} placeholder={outputPlaceholder} />
      }
    />
  );
}
