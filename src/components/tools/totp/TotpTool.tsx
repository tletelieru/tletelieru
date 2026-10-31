import {
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
} from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { clampInt } from '~/lib/tools/_shared/lines';
import { createAsyncCache } from '~/lib/tools/hash/async-cache';
import { clock } from '~/lib/tools/totp-clock';
import {
  groupCode,
  hotp,
  isOtpAlgorithm,
  otpAlgorithms,
  otpDigits,
  readOtpInput,
  secondsRemaining,
  totpCounter,
  type OtpAlgorithm,
  type OtpConfig,
} from '~/lib/tools/totp';
import { useUrlState } from '~/lib/url-state';
import { CopyButton } from '../_shared/CopyButton';
import { InputPanel } from '../_shared/InputPanel';
import { useToolContext } from '../_shared/ToolContext';
import { ToolLayout } from '../_shared/ToolLayout';
import { totpMessages } from './messages';

const defaults = {
  type: 'totp',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
  counter: 0,
};

const PLACEHOLDER = 'JBSWY3DPEHPK3PXP';
const EMPTY = '–';

interface Codes {
  previous: string;
  current: string;
  next: string;
}

const cache = createAsyncCache<Codes>(4);

export default function TotpTool() {
  const t = useMessages(totpMessages);
  const [state, update] = useUrlState(defaults);
  const [secret, setSecret] = useState('');
  const now = useSyncExternalStore(clock.subscribe, clock.now, clock.server);
  useSyncExternalStore(cache.subscribe, cache.getVersion, cache.getVersion);

  const parsed = useMemo(() => readOtpInput(secret), [secret]);
  const key = parsed.ok ? parsed.key : null;
  const { outputRef } = useToolContext();
  const fromUri = parsed.ok && Object.keys(parsed.account.config).length > 0;

  const config: OtpConfig = useMemo(
    () => ({
      type: state.type === 'hotp' ? 'hotp' : 'totp',
      algorithm: isOtpAlgorithm(state.algorithm) ? state.algorithm : 'SHA1',
      digits: clampInt(state.digits, 6, 10),
      period: clampInt(state.period, 1, 3600),
      counter: clampInt(state.counter, 0, Number.MAX_SAFE_INTEGER),
    }),
    [state],
  );

  const isTotp = config.type === 'totp';
  const ready = key !== null && (!isTotp || now > 0);
  const counter = isTotp ? totpCounter(now, config.period) : config.counter;
  const remaining = secondsRemaining(now, config.period);

  const entry =
    ready && key
      ? cache.read([secret, config.algorithm, config.digits, counter].join('\u0000'), async () => {
          const [previous, current, next] = await Promise.all(
            [counter - 1, counter, counter + 1].map((value) =>
              value < 0 ? Promise.resolve('') : hotp(key, value, config.algorithm, config.digits),
            ),
          );
          return { previous: previous ?? '', current: current ?? '', next: next ?? '' };
        })
      : null;
  const codes = entry?.status === 'done' ? entry.value : null;

  useImperativeHandle(outputRef, () => ({ value: codes?.current ?? '' }), [codes]);

  const onSecretChange = useCallback(
    (value: string) => {
      setSecret(value);
      const read = readOtpInput(value);
      if (read.ok && Object.keys(read.account.config).length > 0) update(read.account.config);
    },
    [update],
  );

  const onTypeChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ type: value });
    },
    [update],
  );

  const onAlgorithmChange = useCallback(
    (_: unknown, value: OtpAlgorithm | null) => {
      if (value) update({ algorithm: value });
    },
    [update],
  );

  const onDigitsChange = useCallback(
    (_: unknown, value: number | null) => {
      if (value) update({ digits: value });
    },
    [update],
  );

  const onPeriodChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ period: clampInt(Number(event.target.value), 1, 3600) }),
    [update],
  );

  const onCounterChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ counter: clampInt(Number(event.target.value), 0, Number.MAX_SAFE_INTEGER) }),
    [update],
  );

  const onNextCounter = useCallback(
    () => update({ counter: config.counter + 1 }),
    [update, config.counter],
  );

  const account = parsed.ok ? t.account(parsed.account.issuer, parsed.account.label) : '';
  const error = parsed.ok ? '' : t.errors[parsed.error];

  return (
    <ToolLayout
      options={
        <>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={config.type}
            onChange={onTypeChange}
            aria-label={t.type}
          >
            <ToggleButton value="totp">TOTP</ToggleButton>
            <ToggleButton value="hotp">HOTP</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={config.algorithm}
            onChange={onAlgorithmChange}
            aria-label={t.algorithm}
          >
            {otpAlgorithms.map((algorithm) => (
              <ToggleButton key={algorithm} value={algorithm}>
                {algorithm}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={config.digits}
            onChange={onDigitsChange}
            aria-label={t.digits}
          >
            {otpDigits.map((digits) => (
              <ToggleButton key={digits} value={digits}>
                {digits}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {isTotp && (
            <TextField
              type="number"
              label={t.period}
              value={config.period}
              sx={{ width: 120 }}
              slotProps={{ htmlInput: { min: 1, max: 3600 } }}
              onChange={onPeriodChange}
            />
          )}
          {!isTotp && (
            <TextField
              type="number"
              label={t.counter}
              value={config.counter}
              sx={{ width: 140 }}
              slotProps={{ htmlInput: { min: 0 } }}
              onChange={onCounterChange}
            />
          )}
          {!isTotp && (
            <Button variant="outlined" onClick={onNextCounter}>
              {t.nextCounter}
            </Button>
          )}
        </>
      }
      input={
        <Stack spacing={1}>
          <InputPanel
            label={t.secret}
            placeholder={PLACEHOLDER}
            value={secret}
            onChange={onSecretChange}
            minRows={2}
            history={false}
          />
          {fromUri && (
            <Typography variant="body2" color="text.secondary">
              {t.fromUri}
            </Typography>
          )}
          {error !== '' && <Alert severity="error">{error}</Alert>}
        </Stack>
      }
      output={
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
              {t.code}
              {account !== '' && (
                <Typography component="span" variant="body2" color="text.secondary">
                  {` · ${account}`}
                </Typography>
              )}
            </Typography>
            <CopyButton text={codes?.current ?? ''} />
          </Stack>
          <Typography
            aria-label={t.code}
            aria-live="polite"
            sx={{
              fontFamily: 'var(--sl-font-mono, ui-monospace, monospace)',
              fontSize: '2.5rem',
              letterSpacing: '0.1em',
              lineHeight: 1.2,
            }}
          >
            {codes ? groupCode(codes.current) : EMPTY}
          </Typography>
          {isTotp && (
            <Stack spacing={0.5}>
              <LinearProgress
                variant="determinate"
                value={ready ? (remaining / config.period) * 100 : 0}
                aria-label={t.expires(remaining)}
              />
              <Typography variant="body2" color="text.secondary">
                {ready ? t.expires(remaining) : EMPTY}
              </Typography>
            </Stack>
          )}
          <Typography variant="body2" color="text.secondary">
            {`${t.previous}: ${codes?.previous ? groupCode(codes.previous) : EMPTY} · ${t.next}: ${codes ? groupCode(codes.next) : EMPTY}`}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t.privacy}
          </Typography>
        </Stack>
      }
    />
  );
}
