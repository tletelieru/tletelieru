import { useCallback, useMemo, type ChangeEvent, type MouseEvent } from 'react';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import {
  buildUrl,
  decodeUrlText,
  encodeUrlText,
  parseUrl,
  urlScopes,
  type ParsedUrl,
  type QueryRow,
  type UrlIssue,
  type UrlParts,
  type UrlScope,
} from '~/lib/tools/url';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { urlMessages } from './messages';

type Mode = 'encode' | 'decode' | 'parse' | 'build';

type UrlMessages = (typeof urlMessages)['en'];

const modes: Mode[] = ['encode', 'decode', 'parse', 'build'];

const partKeys: (keyof Omit<UrlParts, 'href'>)[] = [
  'protocol',
  'username',
  'password',
  'hostname',
  'port',
  'pathname',
  'search',
  'hash',
];

const emptyRows: QueryRow[] = [{ key: '', value: '' }];

const defaults = { mode: 'encode', input: '', scope: 'component', form: false, base: '', rows: '' };

const parsePlaceholder = 'https://example.com:8080/path?q=hola%20mundo&tag=a&tag=b#top';
const codecPlaceholder = 'a b&c=ñ';

const mono = { fontFamily: 'var(--sl-font-mono, ui-monospace, monospace)', wordBreak: 'break-all' };

function parseRows(json: string): QueryRow[] {
  if (!json) return emptyRows;
  try {
    const value: unknown = JSON.parse(json);
    if (!Array.isArray(value)) return emptyRows;
    const rows = value
      .filter(
        (row): row is [string, string] =>
          Array.isArray(row) && typeof row[0] === 'string' && typeof row[1] === 'string',
      )
      .map(([key, rowValue]) => ({ key, value: rowValue }));
    return rows.length > 0 ? rows : emptyRows;
  } catch {
    return emptyRows;
  }
}

function serializeRows(rows: QueryRow[]): string {
  if (rows.length === 1 && !rows[0].key && !rows[0].value) return '';
  return JSON.stringify(rows.map((row) => [row.key, row.value]));
}

function describeIssue(issue: UrlIssue, t: UrlMessages): string {
  return t.issues[issue.code](issue.position);
}

function parsedJson(parsed: ParsedUrl): string {
  if (parsed.kind !== 'url' && parsed.kind !== 'query') return '';
  const params = parsed.params.map(({ key, value }) => ({ key, value }));
  const body = parsed.kind === 'url' ? { ...parsed.parts, params } : { params };
  return JSON.stringify(body, null, 2);
}

export default function UrlTool() {
  const t = useMessages(urlMessages);
  const [state, update] = useUrlState(defaults);
  const mode: Mode = modes.includes(state.mode as Mode) ? (state.mode as Mode) : 'encode';
  const scope: UrlScope = (urlScopes as readonly string[]).includes(state.scope)
    ? (state.scope as UrlScope)
    : 'component';
  const rows = useMemo(() => parseRows(state.rows), [state.rows]);

  const codec = useMemo(() => {
    if (mode === 'encode') return encodeUrlText(state.input, { scope, form: state.form });
    if (mode === 'decode') return decodeUrlText(state.input, { scope, form: state.form });
    return null;
  }, [mode, state.input, scope, state.form]);

  const parsed = useMemo(
    () => (mode === 'parse' ? parseUrl(state.input) : null),
    [mode, state.input],
  );

  const output = useMemo(() => {
    if (codec) return codec.ok ? codec.value : '';
    if (parsed) return parsedJson(parsed);
    return buildUrl(state.base, rows, { form: state.form });
  }, [codec, parsed, state.base, rows, state.form]);

  const outputPlaceholder = useMemo(() => {
    if (mode === 'encode') {
      const preview = encodeUrlText(codecPlaceholder, { scope, form: state.form });
      return preview.ok ? preview.value : undefined;
    }
    if (mode === 'decode') {
      const preview = decodeUrlText(codecPlaceholder, { scope, form: state.form });
      return preview.ok ? preview.value : undefined;
    }
    if (mode === 'parse') return parsedJson(parseUrl(parsePlaceholder));
    return undefined;
  }, [mode, scope, state.form]);

  const error = useMemo(() => {
    if (codec && !codec.ok) return describeIssue(codec.issue, t);
    if (parsed?.kind === 'invalid') return t.invalidUrl;
    if (parsed?.kind === 'url' || parsed?.kind === 'query') {
      const issues = parsed.params.flatMap((param) =>
        param.issue ? [t.paramIssue(param.key, describeIssue(param.issue, t))] : [],
      );
      return issues.length > 0 ? issues.join(' ') : null;
    }
    return null;
  }, [codec, parsed, t]);

  const setRows = useCallback(
    (next: QueryRow[]) => update({ rows: serializeRows(next) }),
    [update],
  );

  const onModeChange = useCallback(
    (_: unknown, value: Mode | null) => {
      if (value) update({ mode: value });
    },
    [update],
  );

  const onScopeChange = useCallback(
    (_: unknown, value: UrlScope | null) => {
      if (value) update({ scope: value });
    },
    [update],
  );

  const onFormChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ form: event.target.checked }),
    [update],
  );

  const onInputChange = useCallback((input: string) => update({ input }), [update]);

  const onBaseChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ base: event.target.value }),
    [update],
  );

  const onRowChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const index = Number(event.target.dataset.index);
      const field = event.target.dataset.field === 'value' ? 'value' : 'key';
      setRows(
        rows.map((row, current) =>
          current === index ? { ...row, [field]: event.target.value } : row,
        ),
      );
    },
    [rows, setRows],
  );

  const onAddRow = useCallback(() => setRows([...rows, { key: '', value: '' }]), [rows, setRows]);

  const onRemoveRow = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const index = Number(event.currentTarget.dataset.index);
      const next = rows.filter((_, current) => current !== index);
      setRows(next.length > 0 ? next : emptyRows);
    },
    [rows, setRows],
  );

  const showScope = mode === 'encode' || mode === 'decode';
  const showForm = mode !== 'parse';
  const params = parsed?.kind === 'url' || parsed?.kind === 'query' ? parsed.params : [];

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
            {modes.map((value) => (
              <ToggleButton key={value} value={value}>
                {t.modeName[value]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {showScope && (
            <ToggleButtonGroup
              exclusive
              size="small"
              value={scope}
              onChange={onScopeChange}
              aria-label={t.scope}
            >
              {urlScopes.map((value) => (
                <ToggleButton key={value} value={value} sx={{ textTransform: 'none' }}>
                  {t.scopeName[value]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
          {showForm && (
            <FormControlLabel
              control={<Switch checked={state.form} onChange={onFormChange} />}
              label={t.form}
            />
          )}
        </>
      }
      input={
        mode === 'build' ? (
          <Stack spacing={1.5}>
            <TextField label={t.base} value={state.base} onChange={onBaseChange} fullWidth />
            {rows.map((row, index) => (
              <Stack key={index} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <TextField
                  label={t.key}
                  value={row.key}
                  onChange={onRowChange}
                  slotProps={{ htmlInput: { 'data-index': index, 'data-field': 'key' } }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label={t.value}
                  value={row.value}
                  onChange={onRowChange}
                  slotProps={{ htmlInput: { 'data-index': index, 'data-field': 'value' } }}
                  sx={{ flex: 2 }}
                />
                <Button
                  size="small"
                  data-index={index}
                  aria-label={t.removeRow(index)}
                  onClick={onRemoveRow}
                >
                  ✕
                </Button>
              </Stack>
            ))}
            <div>
              <Button variant="outlined" onClick={onAddRow}>
                {t.addRow}
              </Button>
            </div>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <InputPanel
              label={t.inputLabel[mode]}
              placeholder={mode === 'parse' ? parsePlaceholder : codecPlaceholder}
              value={state.input}
              onChange={onInputChange}
            />
            {parsed?.kind === 'url' && (
              <Stack spacing={1}>
                <Typography variant="subtitle2">{t.parts}</Typography>
                <Table size="small" aria-label={t.parts}>
                  <TableBody>
                    {partKeys
                      .filter((key) => parsed.parts[key] !== '')
                      .map((key) => (
                        <TableRow key={key}>
                          <TableCell component="th" scope="row" sx={{ width: 140 }}>
                            {t.partName[key]}
                          </TableCell>
                          <TableCell sx={mono}>{parsed.parts[key]}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </Stack>
            )}
            {mode === 'parse' && (parsed?.kind === 'url' || parsed?.kind === 'query') && (
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
                  <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                    {t.params}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t.summary(params.length)}
                  </Typography>
                </Stack>
                {params.length > 0 ? (
                  <Table size="small" aria-label={t.params}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: 40 }}>#</TableCell>
                        <TableCell>{t.key}</TableCell>
                        <TableCell>{t.value}</TableCell>
                        <TableCell>{t.raw}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {params.map((param, index) => (
                        <TableRow key={`${param.position}-${param.raw}`}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell sx={mono}>{param.key}</TableCell>
                          <TableCell sx={mono}>{param.value}</TableCell>
                          <TableCell sx={{ ...mono, color: 'text.secondary' }}>
                            {param.raw}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {t.noParams}
                  </Typography>
                )}
              </Stack>
            )}
          </Stack>
        )
      }
      output={<OutputPanel value={output} error={error} placeholder={outputPlaceholder} />}
    />
  );
}
