import { useCallback, useSyncExternalStore } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { useHydrated } from '~/lib/hydration';
import { clampInt } from '~/lib/tools/_shared/lines';
import { createAsyncCache } from '~/lib/tools/hash/async-cache';
import { pickOption } from '~/lib/tools/sql/format';
import { clock } from '~/lib/tools/totp-clock';
import {
  toleranceStatus,
  verifyWebhook,
  webhookAlgorithms,
  webhookProviders,
  type WebhookInput,
  type WebhookProvider,
  type WebhookResult,
} from '~/lib/tools/webhook-verify';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { ChoiceToggle, TextOption, useSetter } from '../_shared/options';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { webhookVerifyMessages } from './messages';

type Messages = (typeof webhookVerifyMessages)['en'];
type Sample = Pick<WebhookInput, 'secret' | 'signature' | 'messageId' | 'timestamp'>;

const defaults = { provider: 'stripe', algorithm: 'sha256', tolerance: '300' };
const emptyFields = { secret: '', payload: '', signature: '', messageId: '', timestamp: '' };

const SAMPLE_PAYLOAD = '{"id":"evt_1","type":"payment.succeeded"}';
const GITHUB_HEX = '5320fab54f300e24656cb47617cd6d91c8d8a447c45d1eb941c2e0851f1536b7';

const SAMPLES: Record<WebhookProvider, Sample> = {
  stripe: {
    secret: 'whsec_test_secret',
    signature: 't=1700000000,v1=0a731970e30844c135c2ba545c0b030783248e5151afff97d4b4cac22ffa7321',
    messageId: '',
    timestamp: '',
  },
  github: {
    secret: 'my_secret',
    signature: `sha256=${GITHUB_HEX}`,
    messageId: '',
    timestamp: '',
  },
  svix: {
    secret: 'whsec_c3ZpeF90ZXN0X3NlY3JldF9rZXk=',
    signature: 'v1,X0vUmjeZJcdUB2M1VK8tsdGmUubLTS++AiaiEyqDGUQ=',
    messageId: 'msg_1',
    timestamp: '1700000000',
  },
  generic: { secret: 'my_secret', signature: GITHUB_HEX, messageId: '', timestamp: '' },
};

const cache = createAsyncCache<WebhookResult>(8);

function cacheKey(input: WebhookInput): string {
  return Object.values(input).join('\u0000');
}

function describe(
  result: WebhookResult,
  t: Messages,
  now: number,
  tolerance: number,
): { value: string; error: string | null } {
  if (!result.ok) return { value: '', error: t.errors[result.error] };
  const { match, expected, signedPayload, timestamp } = result.check;
  const lines = [
    match ? t.match : t.mismatch,
    `${t.expected}: ${expected}`,
    `${t.signedPayload}: ${signedPayload}`,
  ];
  if (timestamp !== null) {
    lines.push(`${t.timestampLine}: ${new Date(timestamp * 1000).toISOString()}`);
    if (now > 0) lines.push(t.toleranceLine[toleranceStatus(timestamp, now, tolerance)](tolerance));
  }
  return { value: lines.join('\n'), error: null };
}

export default function WebhookVerifyTool() {
  const t = useMessages(webhookVerifyMessages);
  const hydrated = useHydrated();
  const [state, update] = useUrlState(defaults);
  const [fields, setFields] = useUrlState(emptyFields, { sync: false });
  const now = useSyncExternalStore(clock.subscribe, clock.now, clock.server);
  useSyncExternalStore(cache.subscribe, cache.getVersion, cache.getVersion);

  const provider = pickOption(state.provider, webhookProviders, 'stripe');
  const algorithm = pickOption(state.algorithm, webhookAlgorithms, 'sha256');
  const tolerance = clampInt(Number(state.tolerance), 0, 31_536_000);
  const sample = SAMPLES[provider];
  const usesSvixHeaders = provider === 'svix';

  const input: WebhookInput = { ...fields, provider, algorithm };
  const sampleInput: WebhookInput = { ...sample, provider, algorithm, payload: SAMPLE_PAYLOAD };
  const active =
    hydrated && fields.secret !== '' && fields.payload !== '' && fields.signature.trim() !== '';

  const entry = active ? cache.read(cacheKey(input), () => verifyWebhook(input)) : null;
  const sampleEntry = hydrated
    ? cache.read(cacheKey(sampleInput), () => verifyWebhook(sampleInput))
    : null;

  const shown =
    entry?.status === 'done'
      ? describe(entry.value, t, now, tolerance)
      : { value: '', error: null };
  const preview =
    sampleEntry?.status === 'done' ? describe(sampleEntry.value, t, 0, tolerance).value : undefined;

  const onProvider = useSetter(update, 'provider');
  const onAlgorithm = useSetter(update, 'algorithm');
  const onTolerance = useSetter(update, 'tolerance');
  const onSecret = useCallback((secret: string) => setFields({ secret }), [setFields]);
  const onPayload = useCallback((payload: string) => setFields({ payload }), [setFields]);
  const onSignature = useCallback((signature: string) => setFields({ signature }), [setFields]);
  const onMessageId = useCallback((messageId: string) => setFields({ messageId }), [setFields]);
  const onTimestamp = useCallback((timestamp: string) => setFields({ timestamp }), [setFields]);

  return (
    <ToolLayout
      options={
        <>
          <ChoiceToggle
            label={t.provider}
            value={provider}
            options={webhookProviders}
            labels={t.providers}
            onChange={onProvider}
          />
          {provider === 'generic' && (
            <ChoiceToggle
              label={t.algorithm}
              value={algorithm}
              options={webhookAlgorithms}
              labels={t.algorithms}
              onChange={onAlgorithm}
            />
          )}
          {(provider === 'stripe' || usesSvixHeaders) && (
            <TextOption
              label={t.tolerance}
              value={state.tolerance}
              onChange={onTolerance}
              width={170}
            />
          )}
        </>
      }
      input={
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <TextOption
              label={t.secret}
              type="password"
              value={fields.secret}
              onChange={onSecret}
              placeholder={sample.secret}
              width={300}
            />
            {usesSvixHeaders && (
              <TextOption
                label={t.messageId}
                value={fields.messageId}
                onChange={onMessageId}
                placeholder={sample.messageId}
                width={170}
              />
            )}
            {usesSvixHeaders && (
              <TextOption
                label={t.timestamp}
                value={fields.timestamp}
                onChange={onTimestamp}
                placeholder={sample.timestamp}
                width={170}
              />
            )}
          </Stack>
          <InputPanel
            label={t.payload}
            placeholder={SAMPLE_PAYLOAD}
            value={fields.payload}
            onChange={onPayload}
            minRows={4}
            history={false}
          />
          <InputPanel
            label={t.signature[provider]}
            placeholder={sample.signature}
            value={fields.signature}
            onChange={onSignature}
            minRows={2}
            history={false}
          />
        </Stack>
      }
      output={
        <Stack spacing={1}>
          <OutputPanel
            label={t.result}
            value={shown.value}
            error={shown.error}
            placeholder={preview}
            snippet={false}
          />
          <Typography variant="caption" color="text.secondary">
            {t.privacy}
          </Typography>
        </Stack>
      }
    />
  );
}
