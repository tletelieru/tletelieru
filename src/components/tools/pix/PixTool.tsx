import { useCallback, useMemo } from 'react';
import { useMessages } from '~/i18n/react';
import {
  buildPix,
  parsePix,
  pixModes,
  validatePixKey,
  type PixCode,
  type PixKeyReport,
  type PixMode,
} from '~/lib/tools/pix';
import { pickOption } from '~/lib/tools/sql/format';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { ChoiceToggle, TextOption, useSetter } from '../_shared/options';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { pixMessages } from './messages';

type Messages = (typeof pixMessages)['en'];

const defaults = {
  input: '',
  mode: 'parse',
  name: '',
  city: '',
  amount: '',
  txid: '',
  description: '',
};

const SAMPLE_KEY = '123e4567-e12b-12d1-a456-426655440000';
const SAMPLE_NAME = 'Fulano de Tal';
const SAMPLE_CITY = 'BRASILIA';

const PLACEHOLDERS: Record<PixMode, string> = {
  parse:
    '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D',
  generate: SAMPLE_KEY,
  key: `529.982.247-25\nfulano@example.com\n+5511987654321\n${SAMPLE_KEY}`,
};

function describeCode(code: PixCode, t: Messages): string {
  const keyType = validatePixKey(code.key).type;
  const rows: [string, string][] = [
    [t.fields.key, code.key],
    [t.fields.keyType, keyType ? t.keyTypes[keyType] : ''],
    [t.fields.description, code.description],
    [t.fields.url, code.url],
    [t.fields.name, code.name],
    [t.fields.city, code.city],
    [t.fields.amount, code.amount],
    [t.fields.currency, code.currency],
    [t.fields.country, code.country],
    [t.fields.category, code.category],
    [t.fields.txid, code.txid],
    [t.fields.initiation, t.initiation[code.initiation] ?? code.initiation],
    [t.fields.crc, `${code.crc} · ${code.crcValid ? t.crcOk : t.crcBad(code.expectedCrc)}`],
  ];
  return rows
    .filter(([, value]) => value !== '')
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n');
}

function describeKey(input: string, report: PixKeyReport, t: Messages): string {
  const type = report.type ? t.keyTypes[report.type] : t.unknownKey;
  return `${input.trim()} · ${type} · ${report.valid ? t.valid : t.invalid}`;
}

interface Output {
  value: string;
  error: string | null;
}

function run(input: string, mode: PixMode, details: typeof defaults, t: Messages): Output {
  if (input.trim() === '') return { value: '', error: null };
  if (mode === 'parse') {
    const parsed = parsePix(input);
    return parsed.ok
      ? { value: describeCode(parsed.code, t), error: null }
      : { value: '', error: t.parseError[parsed.error] };
  }
  if (mode === 'generate') {
    const built = buildPix({ ...details, key: input });
    return built.ok
      ? { value: built.code, error: null }
      : { value: '', error: t.buildError[built.error] };
  }
  const lines = input.split(/\r?\n/).filter((line) => line.trim() !== '');
  return {
    value: lines.map((line) => describeKey(line, validatePixKey(line), t)).join('\n'),
    error: null,
  };
}

export default function PixTool() {
  const t = useMessages(pixMessages);
  const [state, update] = useUrlState(defaults);
  const mode = pickOption(state.mode, pixModes, 'parse');

  const result = useMemo(() => run(state.input, mode, state, t), [state, mode, t]);
  const preview = useMemo(
    () =>
      run(
        PLACEHOLDERS[mode],
        mode,
        { ...state, name: state.name || SAMPLE_NAME, city: state.city || SAMPLE_CITY },
        t,
      ).value,
    [state, mode, t],
  );

  const onInput = useCallback((input: string) => update({ input }), [update]);
  const onMode = useSetter(update, 'mode');
  const onName = useSetter(update, 'name');
  const onCity = useSetter(update, 'city');
  const onAmount = useSetter(update, 'amount');
  const onTxid = useSetter(update, 'txid');
  const onDescription = useSetter(update, 'description');

  const inputLabels: Record<PixMode, string> = { parse: t.code, generate: t.key, key: t.keys };

  return (
    <ToolLayout
      options={
        <>
          <ChoiceToggle
            label={t.mode}
            value={mode}
            options={pixModes}
            labels={t.modes}
            onChange={onMode}
          />
          {mode === 'generate' && (
            <>
              <TextOption
                label={t.name}
                value={state.name}
                onChange={onName}
                placeholder={SAMPLE_NAME}
                width={190}
              />
              <TextOption
                label={t.city}
                value={state.city}
                onChange={onCity}
                placeholder={SAMPLE_CITY}
                width={150}
              />
              <TextOption label={t.amount} value={state.amount} onChange={onAmount} width={170} />
              <TextOption label={t.txid} value={state.txid} onChange={onTxid} width={200} />
              <TextOption
                label={t.description}
                value={state.description}
                onChange={onDescription}
                width={200}
              />
            </>
          )}
        </>
      }
      input={
        <InputPanel
          label={inputLabels[mode]}
          placeholder={PLACEHOLDERS[mode]}
          value={state.input}
          onChange={onInput}
          minRows={4}
        />
      }
      output={<OutputPanel value={result.value} placeholder={preview} error={result.error} />}
    />
  );
}
