import { Fragment, useCallback, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useLocale, useMessages } from '~/i18n/react';
import { HANDOFF_PARAM } from '~/lib/handoff';
import { useHydrated } from '~/lib/hydration';
import {
  decodeJwt,
  describeClaimTimes,
  type JwtDecoded,
  type JwtError,
  type JwtSegment,
  type JwtWarning,
} from '~/lib/tools/jwt';
import { formatRelative } from '~/lib/tools/unix';
import { readHandoff, useUrlState } from '~/lib/url-state';
import { CopyButton } from '../_shared/CopyButton';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { ZonePicker } from '../time/ZonePicker';
import { jwtMessages } from './messages';

type JwtMessages = (typeof jwtMessages)['en'];
type TokenSource = 'handoff' | 'url' | null;

interface InitialToken {
  token: string;
  source: TokenSource;
}

const defaults = { zone: 'America/Santiago' };

const segmentColors: Record<JwtSegment, string> = {
  header: '#e5484d',
  payload: '#a855f7',
  signature: '#0ea5e9',
};

const segmentOrder: JwtSegment[] = ['header', 'payload', 'signature'];

const mono = { fontFamily: 'var(--sl-font-mono, ui-monospace, monospace)', fontSize: 14 };

const NO_TOKEN: InitialToken = { token: '', source: null };

let initialCache: { search: string; value: InitialToken } | null = null;

function readInitialToken(): InitialToken {
  const search = window.location.search;
  if (!initialCache || initialCache.search !== search) {
    const fromHandoff = readHandoff(search)?.input;
    const fromUrl = new URLSearchParams(search).get('input');
    let value: InitialToken = { token: '', source: null };
    if (fromHandoff) value = { token: fromHandoff, source: 'handoff' };
    else if (fromUrl) value = { token: fromUrl, source: 'url' };
    initialCache = { search, value };
  }
  return initialCache.value;
}

function describeError(error: JwtError, t: JwtMessages): string {
  switch (error.code) {
    case 'empty':
      return '';
    case 'segments':
      return t.errors.segments(error.count);
    case 'jwe':
      return t.errors.jwe;
    case 'base64':
      return t.errors.base64(t.segmentNames[error.segment]);
    case 'utf8':
      return t.errors.utf8(t.segmentNames[error.segment]);
    case 'json':
      return t.errors.json(t.segmentNames[error.segment], error.detail.line, error.detail.column);
    case 'not-object':
      return t.errors.notObject(t.segmentNames[error.segment]);
  }
}

function describeWarning(warning: JwtWarning, t: JwtMessages): string {
  switch (warning.code) {
    case 'alg-none':
      return t.warnings.algNone;
    case 'missing-alg':
      return t.warnings.missingAlg;
    case 'missing-exp':
      return t.warnings.missingExp;
    case 'long-lifetime':
      return t.warnings.longLifetime(warning.days);
    case 'invalid-claim':
      return t.warnings.invalidClaim(warning.claim);
    case 'sensitive-keys':
      return t.warnings.sensitiveKeys(warning.keys.join(', '));
  }
}

function describeStatus(jwt: JwtDecoded, now: number, locale: string, t: JwtMessages): string {
  const { exp, nbf } = jwt.claims;
  if (jwt.status === 'expired' && exp !== undefined) {
    return t.expiredAgo(formatRelative(exp * 1000, now, locale));
  }
  if (jwt.status === 'not-yet-valid' && nbf !== undefined) {
    return t.startsIn(formatRelative(nbf * 1000, now, locale));
  }
  if (exp !== undefined) return t.expiresIn(formatRelative(exp * 1000, now, locale));
  return t.noExpiry;
}

const statusColors = {
  valid: 'success',
  expired: 'error',
  'not-yet-valid': 'warning',
} as const;

export default function JwtTool() {
  const t = useMessages(jwtMessages);
  const locale = useLocale();
  const hydrated = useHydrated();
  const initial = useMemo(() => (hydrated ? readInitialToken() : NO_TOKEN), [hydrated]);
  const [editedToken, setToken] = useState<string | null>(null);
  const token = editedToken ?? initial.token;
  const [sourceOverride, setSource] = useState<TokenSource | undefined>(undefined);
  const source = sourceOverride === undefined ? initial.source : sourceOverride;
  const [now, setNow] = useState(() => Date.now());
  const [state, update] = useUrlState(defaults);

  const result = useMemo(() => decodeJwt(token, now), [token, now]);
  const jwt = result.ok ? result.jwt : null;
  const error = result.ok ? null : describeError(result.error, t) || null;
  const jsonExcerpt = !result.ok && result.error.code === 'json' ? result.error.detail.excerpt : '';

  const times = useMemo(
    () => (jwt ? describeClaimTimes(jwt.claims, now, state.zone, locale) : []),
    [jwt, now, state.zone, locale],
  );

  const onTokenChange = useCallback((value: string) => {
    setNow(Date.now());
    setToken(value);
  }, []);

  const onZoneChange = useCallback(
    (zone: string) => {
      setNow(Date.now());
      update({ zone });
    },
    [update],
  );

  const onRemoveFromUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    params.delete('input');
    params.delete(HANDOFF_PARAM);
    const query = params.toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', url);
    setSource(null);
  }, []);

  const onDismissNotice = useCallback(() => setSource(null), []);

  return (
    <ToolLayout
      options={<ZonePicker label={t.zone} value={state.zone} onChange={onZoneChange} />}
      input={
        <Stack spacing={2}>
          {source === 'url' && (
            <Alert
              severity="warning"
              action={
                <Button color="inherit" size="small" onClick={onRemoveFromUrl}>
                  {t.removeFromUrl}
                </Button>
              }
            >
              {t.fromUrl}
            </Alert>
          )}
          {source === 'handoff' && (
            <Alert severity="info" onClose={onDismissNotice}>
              {t.fromHandoff}
            </Alert>
          )}
          <InputPanel
            label={t.inputLabel}
            placeholder="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.c2ln"
            value={token}
            onChange={onTokenChange}
            minRows={4}
            history={false}
          />
        </Stack>
      }
      output={
        <Stack spacing={2}>
          {error && (
            <Alert severity="error">
              {error}
              {jsonExcerpt && (
                <Box component="pre" sx={{ ...mono, m: 0, mt: 1, whiteSpace: 'pre' }}>
                  {jsonExcerpt}
                </Box>
              )}
            </Alert>
          )}
          {jwt && (
            <>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                <Chip
                  color={statusColors[jwt.status]}
                  label={describeStatus(jwt, now, locale, t)}
                  aria-label={t.status[jwt.status]}
                />
                <Chip
                  variant="outlined"
                  color={jwt.alg && jwt.alg.toLowerCase() !== 'none' ? 'default' : 'error'}
                  label={jwt.alg ? t.algorithm(jwt.alg) : t.noAlgorithm}
                />
                {jwt.typ && <Chip variant="outlined" label={`typ: ${jwt.typ}`} />}
              </Stack>
              {jwt.warnings.map((warning) => (
                <Alert key={warning.code} severity="warning">
                  {describeWarning(warning, t)}
                </Alert>
              ))}
              <Alert severity="info">{t.notVerified}</Alert>
              <Stack spacing={1}>
                <Typography variant="subtitle2">{t.tokenView}</Typography>
                <Box
                  data-testid="jwt-token-view"
                  sx={{
                    ...mono,
                    p: 1.5,
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    wordBreak: 'break-all',
                  }}
                >
                  {segmentOrder.map((segment, index) => (
                    <Fragment key={segment}>
                      {index > 0 && <span>.</span>}
                      <span
                        title={t.segmentNames[segment]}
                        style={{ color: segmentColors[segment] }}
                      >
                        {jwt.parts[segment]}
                      </span>
                    </Fragment>
                  ))}
                </Box>
              </Stack>
            </>
          )}
          <OutputPanel label={t.header} value={jwt?.headerJson ?? ''} snippet={false} />
          <OutputPanel label={t.payload} value={jwt?.payloadJson ?? ''} snippet={false} />
          {jwt && (
            <>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                    {t.signature}
                  </Typography>
                  <CopyButton text={jwt.parts.signature} />
                </Stack>
                <Typography
                  variant="body2"
                  sx={{ ...mono, wordBreak: 'break-all', color: segmentColors.signature }}
                >
                  {jwt.parts.signature || t.unsignedSignature}
                </Typography>
              </Stack>
              {times.length > 0 && (
                <Stack spacing={1}>
                  <Typography variant="subtitle2">{t.claimsTitle}</Typography>
                  <Table size="small" aria-label={t.claimsTitle}>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t.claimColumn}</TableCell>
                        <TableCell>{t.utcColumn}</TableCell>
                        <TableCell>{state.zone}</TableCell>
                        <TableCell>{t.relativeColumn}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {times.map((time) => (
                        <TableRow key={time.claim}>
                          <TableCell>{t.claimNames[time.claim]}</TableCell>
                          <TableCell sx={mono}>{time.utc}</TableCell>
                          <TableCell sx={mono}>{time.zoned}</TableCell>
                          <TableCell>{time.relative}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Stack>
              )}
            </>
          )}
        </Stack>
      }
    />
  );
}
