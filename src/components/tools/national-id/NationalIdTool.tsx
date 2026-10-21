import { useCallback, useMemo, useState, type ChangeEvent } from 'react';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import {
  countries,
  documentsOf,
  generateDocuments,
  resolveDocument,
  type IdDocument,
} from '~/lib/tools/national-id';
import { useLocale, useMessages } from '~/i18n/react';
import { useUrlState } from '~/lib/url-state';
import { clampCount, IdLinesTool, idLinesDefaults } from '../ids/IdLinesTool';
import { nationalIdMessages } from './messages';

const defaults = { ...idLinesDefaults, country: 'ar', doc: 'ar-dni' };

function generate(target: IdDocument, count: number): string[] {
  return generateDocuments(target, clampCount(count));
}

export default function NationalIdTool() {
  const t = useMessages(nationalIdMessages);
  const locale = useLocale();
  const [state, update] = useUrlState(defaults);
  const current = useMemo(
    () => resolveDocument(state.country, state.doc),
    [state.country, state.doc],
  );
  const options = useMemo(() => documentsOf(current.country), [current.country]);
  const [generated, setGenerated] = useState(() => generate(current, state.count));

  const onRegenerate = useCallback(
    (count: number) => setGenerated(generate(current, count)),
    [current],
  );

  const selectDocument = useCallback(
    (next: IdDocument) => {
      update({ country: next.country, doc: next.id });
      setGenerated(generate(next, state.count));
    },
    [update, state.count],
  );

  const onCountryChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      selectDocument(resolveDocument(event.target.value, '')),
    [selectDocument],
  );

  const onDocumentChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      selectDocument(resolveDocument(current.country, event.target.value)),
    [selectDocument, current.country],
  );

  return (
    <IdLinesTool
      state={state}
      onPatch={update}
      generated={generated}
      onRegenerate={onRegenerate}
      validate={current.validate}
      format={current.format}
      noun={current.label[locale]}
      inputLabel={t.inputLabel(current.label[locale])}
      placeholder={current.placeholder}
      styles={current.styles}
      selectors={
        <>
          <TextField
            select
            label={t.country}
            value={current.country}
            sx={{ minWidth: 160 }}
            fullWidth={false}
            onChange={onCountryChange}
          >
            {countries.map((country) => (
              <MenuItem key={country.id} value={country.id}>
                {country.label[locale]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label={t.document}
            value={current.id}
            sx={{ minWidth: 180 }}
            fullWidth={false}
            onChange={onDocumentChange}
            helperText={current.checkDigit ? undefined : t.noCheckDigit}
          >
            {options.map((option) => (
              <MenuItem key={option.id} value={option.id} title={option.name[locale]}>
                {option.label[locale]}
              </MenuItem>
            ))}
          </TextField>
        </>
      }
    />
  );
}
