import { useCallback, useMemo, type ChangeEvent } from 'react';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { caseIds, convertAllCases, convertLines, isCaseId, isMultiline } from '~/lib/tools/case';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { CaseList } from './CaseList';
import { caseMessages } from './messages';

const defaults = { input: '', to: 'snake', ascii: false };

export default function CaseTool() {
  const t = useMessages(caseMessages);
  const [state, update] = useUrlState(defaults);
  const target = isCaseId(state.to) ? state.to : 'snake';
  const options = useMemo(() => ({ stripAccents: state.ascii }), [state.ascii]);

  const output = useMemo(
    () => convertLines(state.input, target, options),
    [state.input, target, options],
  );
  const allCases = useMemo(
    () =>
      state.input.trim() && !isMultiline(state.input)
        ? convertAllCases(state.input.trim(), options).map((item) => ({
            ...item,
            label: t.cases[item.id],
          }))
        : null,
    [state.input, options, t],
  );

  const onInputChange = useCallback((value: string) => update({ input: value }), [update]);

  const onTargetChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ to: event.target.value }),
    [update],
  );

  const onAsciiChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ ascii: event.target.checked }),
    [update],
  );

  return (
    <ToolLayout
      options={
        <>
          <TextField
            select
            label={t.convertTo}
            value={target}
            onChange={onTargetChange}
            sx={{ width: 200 }}
          >
            {caseIds.map((id) => (
              <MenuItem key={id} value={id}>
                {t.cases[id]}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={<Switch checked={state.ascii} onChange={onAsciiChange} />}
            label={t.removeAccents}
          />
        </>
      }
      input={
        <InputPanel
          label={t.inputLabel}
          placeholder={'parseHTTPResponse\nÁrbol de Navidad\nuser_id'}
          value={state.input}
          onChange={onInputChange}
        />
      }
      output={
        <Stack spacing={2}>
          <OutputPanel value={output} label={t.output(t.cases[target])} />
          {allCases ? (
            <Stack spacing={1}>
              <Typography variant="subtitle2">{t.allCases}</Typography>
              <CaseList label={t.allCases} items={allCases} />
            </Stack>
          ) : null}
        </Stack>
      }
    />
  );
}
