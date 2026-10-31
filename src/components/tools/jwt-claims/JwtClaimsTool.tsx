import { useCallback, useMemo, useSyncExternalStore } from 'react';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { clampInt } from '~/lib/tools/_shared/lines';
import { decodeJwt, encodeBase64Url, type JwtDecoded } from '~/lib/tools/jwt';
import {
  checkClaims,
  parseEvaluateAt,
  type ClaimCheck,
  type ClaimExpectations,
  type ClaimName,
} from '~/lib/tools/jwt-claims';
import { formatZonedIso } from '~/lib/tools/time/zones';
import { clock } from '~/lib/tools/totp-clock';
import { useUrlState } from '~/lib/url-state';
import { describeJwtError, useJwtErrors } from '../_shared/jose';
import { InputPanel } from '../_shared/InputPanel';
import { TextOption, useSetter } from '../_shared/options';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { ZonePicker } from '../time/ZonePicker';
import { jwtClaimsMessages } from './messages';

type Messages = (typeof jwtClaimsMessages)['en'];

const defaults = { skew: '60', at: '', zone: 'America/Santiago' };
const emptyFields = { token: '', iss: '', aud: '', sub: '', jti: '' };

const SAMPLE_TOKEN = [
  encodeBase64Url('{"alg":"HS256","typ":"JWT"}'),
  encodeBase64Url(
    '{"iss":"https://issuer.example","aud":"api","sub":"user-1","jti":"id-1","iat":1700000000,"nbf":1700000000,"exp":1700003600}',
  ),
  'ZmFrZS1zaWduYXR1cmU',
].join('.');

const SAMPLE_EXPECTED: ClaimExpectations = {
  iss: 'https://issuer.example',
  aud: 'api',
  sub: '',
  jti: '',
  skewSeconds: 60,
};

const SAMPLE_AT = 1_700_000_600_000;

function showActual(check: ClaimCheck, jwt: JwtDecoded, zone: string): string {
  if (check.actual === undefined) return '';
  const name: ClaimName = check.claim;
  const seconds = name === 'exp' || name === 'nbf' || name === 'iat' ? jwt.claims[name] : undefined;
  const json = JSON.stringify(check.actual);
  if (seconds === undefined) return json;
  return `${json} (${formatZonedIso(Math.round(seconds * 1000), zone)})`;
}

function formatChecks(checks: ClaimCheck[], jwt: JwtDecoded, zone: string, t: Messages): string {
  return checks
    .map((check) => {
      const actual = showActual(check, jwt, zone);
      const value = actual === '' ? '' : ` ${actual}`;
      return `[${t.statuses[check.status]}] ${check.claim}:${value} ${t.codes[check.code]}`;
    })
    .join('\n');
}

const severity = { pass: 'success', warn: 'warning', fail: 'error' } as const;

export default function JwtClaimsTool() {
  const t = useMessages(jwtClaimsMessages);
  const jwtText = useJwtErrors();
  const [state, update] = useUrlState(defaults);
  const [fields, setFields] = useUrlState(emptyFields, { sync: false });
  const clockNow = useSyncExternalStore(clock.subscribe, clock.now, clock.server);

  const fixedAt = parseEvaluateAt(state.at);
  const badAt = state.at.trim() !== '' && fixedAt === null;
  const now = fixedAt ?? clockNow;
  const skewSeconds = clampInt(Number(state.skew), 0, 31_536_000);

  const decoded = useMemo(
    () => (fields.token.trim() === '' ? null : decodeJwt(fields.token, 0)),
    [fields.token],
  );
  const jwt = decoded?.ok ? decoded.jwt : null;
  const error = decoded && !decoded.ok ? describeJwtError(decoded.error, jwtText) : null;
  const report =
    jwt && now > 0 && !badAt ? checkClaims(jwt.payload, { ...fields, skewSeconds }, now) : null;

  const output =
    jwt && report
      ? [
          t.evaluatedAt(formatZonedIso(now, state.zone)),
          formatChecks(report.checks, jwt, state.zone, t),
        ].join('\n')
      : '';

  const placeholder = useMemo(() => {
    const sample = decodeJwt(SAMPLE_TOKEN, 0);
    if (!sample.ok) return undefined;
    const { checks } = checkClaims(sample.jwt.payload, SAMPLE_EXPECTED, SAMPLE_AT);
    return [
      t.evaluatedAt(formatZonedIso(SAMPLE_AT, 'UTC')),
      formatChecks(checks, sample.jwt, 'UTC', t),
    ].join('\n');
  }, [t]);

  const onToken = useCallback((token: string) => setFields({ token }), [setFields]);
  const onIss = useCallback((iss: string) => setFields({ iss }), [setFields]);
  const onAud = useCallback((aud: string) => setFields({ aud }), [setFields]);
  const onSub = useCallback((sub: string) => setFields({ sub }), [setFields]);
  const onJti = useCallback((jti: string) => setFields({ jti }), [setFields]);
  const onSkew = useSetter(update, 'skew');
  const onAt = useSetter(update, 'at');
  const onZone = useSetter(update, 'zone');

  return (
    <ToolLayout
      options={
        <>
          <TextOption label={t.skew} value={state.skew} onChange={onSkew} width={200} />
          <TextOption
            label={t.evaluateAt}
            value={state.at}
            onChange={onAt}
            placeholder={t.evaluateNow}
            width={240}
          />
          <ZonePicker label={t.zone} value={state.zone} onChange={onZone} />
        </>
      }
      input={
        <Stack spacing={2}>
          <InputPanel
            label={t.token}
            placeholder={SAMPLE_TOKEN}
            value={fields.token}
            onChange={onToken}
            minRows={3}
            history={false}
          />
          <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <TextOption
              label={t.expectedIss}
              value={fields.iss}
              onChange={onIss}
              placeholder={SAMPLE_EXPECTED.iss}
              width={240}
            />
            <TextOption
              label={t.expectedAud}
              value={fields.aud}
              onChange={onAud}
              placeholder={SAMPLE_EXPECTED.aud}
              width={160}
            />
            <TextOption
              label={t.expectedSub}
              value={fields.sub}
              onChange={onSub}
              placeholder={t.expectedHint}
              width={160}
            />
            <TextOption
              label={t.expectedJti}
              value={fields.jti}
              onChange={onJti}
              placeholder={t.expectedHint}
              width={160}
            />
          </Stack>
        </Stack>
      }
      output={
        <Stack spacing={1}>
          {badAt && <Alert severity="error">{t.badEvaluateAt}</Alert>}
          {report && <Alert severity={severity[report.overall]}>{t.overall[report.overall]}</Alert>}
          <OutputPanel
            label={t.result}
            value={output}
            error={error}
            placeholder={placeholder}
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
