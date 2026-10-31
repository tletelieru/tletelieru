import { useCallback, useMemo } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { buildBlnkPayload, type BlnkFields } from '~/lib/tools/blnk-payload';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { SwitchOption, TextOption, useSetter } from '../_shared/options';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { blnkPayloadMessages } from './messages';

const defaults = {
  amount: '',
  precision: '100',
  reference: '',
  currency: '',
  source: '',
  destination: '',
  description: '',
  allowOverdraft: false,
  inflight: false,
  skipQueue: false,
  input: '',
};

const SAMPLE = {
  amount: '750.25',
  reference: 'ref_001adcfgf',
  currency: 'USD',
  source: '@WorldUSD',
  destination: 'bln_0be360ca-86fe-457d-be43-daa3f966d8f0',
  description: 'Wallet deposit',
};

const PLACEHOLDER = '{"order_id": "A-1042", "channel": "web"}';

export default function BlnkPayloadTool() {
  const t = useMessages(blnkPayloadMessages);
  const [state, update] = useUrlState(defaults);
  const { input, ...form } = state;
  const fields: BlnkFields = useMemo(() => ({ ...form, metaData: input }), [form, input]);
  const active =
    input.trim() !== '' ||
    [form.amount, form.reference, form.currency, form.source, form.destination].some(
      (value) => value.trim() !== '',
    );

  const result = useMemo(() => (active ? buildBlnkPayload(fields) : null), [active, fields]);
  const preview = useMemo(() => {
    const sample = buildBlnkPayload({
      ...fields,
      amount: fields.amount || SAMPLE.amount,
      reference: fields.reference || SAMPLE.reference,
      currency: fields.currency || SAMPLE.currency,
      source: fields.source || SAMPLE.source,
      destination: fields.destination || SAMPLE.destination,
      description: fields.description || SAMPLE.description,
      metaData: fields.metaData || PLACEHOLDER,
    });
    return sample.ok ? sample.output : undefined;
  }, [fields]);

  const onAmount = useSetter(update, 'amount');
  const onPrecision = useSetter(update, 'precision');
  const onReference = useSetter(update, 'reference');
  const onCurrency = useSetter(update, 'currency');
  const onSource = useSetter(update, 'source');
  const onDestination = useSetter(update, 'destination');
  const onDescription = useSetter(update, 'description');
  const onOverdraft = useSetter(update, 'allowOverdraft');
  const onInflight = useSetter(update, 'inflight');
  const onSkipQueue = useSetter(update, 'skipQueue');
  const onInput = useCallback((value: string) => update({ input: value }), [update]);
  const onGenerate = useCallback(
    () => update({ reference: `ref_${crypto.randomUUID()}` }),
    [update],
  );

  return (
    <ToolLayout
      options={
        <>
          <TextOption
            label={t.amount}
            value={form.amount}
            onChange={onAmount}
            placeholder={SAMPLE.amount}
            width={130}
          />
          <TextOption
            label={t.precision}
            value={form.precision}
            onChange={onPrecision}
            width={110}
          />
          <TextOption
            label={t.currency}
            value={form.currency}
            onChange={onCurrency}
            placeholder={SAMPLE.currency}
            width={110}
          />
          <TextOption
            label={t.reference}
            value={form.reference}
            onChange={onReference}
            placeholder={SAMPLE.reference}
            width={260}
          />
          <Button variant="outlined" onClick={onGenerate}>
            {t.generate}
          </Button>
          <TextOption
            label={t.source}
            value={form.source}
            onChange={onSource}
            placeholder={SAMPLE.source}
            width={260}
          />
          <TextOption
            label={t.destination}
            value={form.destination}
            onChange={onDestination}
            placeholder={SAMPLE.destination}
            width={360}
          />
          <TextOption
            label={t.description}
            value={form.description}
            onChange={onDescription}
            placeholder={SAMPLE.description}
            width={260}
          />
          <SwitchOption
            label={t.allowOverdraft}
            checked={form.allowOverdraft}
            onChange={onOverdraft}
          />
          <SwitchOption label={t.inflight} checked={form.inflight} onChange={onInflight} />
          <SwitchOption label={t.skipQueue} checked={form.skipQueue} onChange={onSkipQueue} />
        </>
      }
      input={
        <InputPanel
          label={t.metaData}
          placeholder={PLACEHOLDER}
          value={input}
          onChange={onInput}
          minRows={3}
        />
      }
      output={
        <Stack spacing={1}>
          {result?.ok && result.lossy && <Alert severity="warning">{t.lossy}</Alert>}
          <OutputPanel
            value={result?.ok ? result.output : ''}
            placeholder={preview}
            error={
              result && !result.ok ? result.errors.map((code) => t.errors[code]).join(' · ') : null
            }
            actions={
              result?.ok && (
                <Typography variant="body2" color="text.secondary">
                  {t.precise(result.preciseAmount)}
                </Typography>
              )
            }
          />
        </Stack>
      }
    />
  );
}
