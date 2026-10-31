import { useCallback, useMemo } from 'react';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useLocale, useMessages } from '~/i18n/react';
import type { Locale } from '~/i18n/locales';
import { useHydrated } from '~/lib/hydration';
import { formatTable } from '~/lib/tools/csv-table';
import {
  currencies,
  searchCurrencies,
  type CountryName,
  type Currency,
} from '~/lib/tools/iso-4217';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { iso4217Messages } from './messages';

const defaults = { input: '' };
const PLACEHOLDER = 'CLP';

type Messages = (typeof iso4217Messages)['en'];

function createCountryName(locale: Locale | null): CountryName {
  if (!locale) return (code) => code;
  const names = new Intl.DisplayNames([locale], { type: 'region' });
  return (code) => names.of(code) ?? code;
}

function currencyRow(
  currency: Currency,
  locale: Locale,
  countryName: CountryName,
  t: Messages,
): string[] {
  return [
    currency.code,
    currency.numeric,
    currency.name[locale],
    currency.minor === null ? t.none : String(currency.minor),
    currency.countries.map(countryName).join(', '),
  ];
}

export default function Iso4217Tool() {
  const t = useMessages(iso4217Messages);
  const locale = useLocale();
  const hydrated = useHydrated();
  const [state, update] = useUrlState(defaults);

  const countryName = useMemo(
    () => createCountryName(hydrated ? locale : null),
    [hydrated, locale],
  );

  const toText = useCallback(
    (list: readonly Currency[]) =>
      formatTable(
        [t.code, t.numeric, t.name, t.minor, t.countries],
        list.map((currency) => currencyRow(currency, locale, countryName, t)),
        { style: 'box', alignNumbers: false },
      ),
    [t, locale, countryName],
  );

  const matches = useMemo(
    () => searchCurrencies(state.input, countryName),
    [state.input, countryName],
  );
  const preview = useMemo(
    () => toText(searchCurrencies(PLACEHOLDER, countryName)),
    [toText, countryName],
  );
  const active = state.input.trim() !== '';
  const onInput = useCallback((input: string) => update({ input }), [update]);

  return (
    <ToolLayout
      input={
        <InputPanel
          label={t.search}
          placeholder={PLACEHOLDER}
          value={state.input}
          onChange={onInput}
          minRows={1}
        />
      }
      output={
        <Stack spacing={2}>
          <OutputPanel
            value={active && matches.length > 0 ? toText(matches) : ''}
            placeholder={preview}
            error={active && matches.length === 0 ? t.noMatches : null}
            actions={
              <Typography variant="body2" color="text.secondary">
                {t.count(matches.length, currencies.length)}
              </Typography>
            }
          />
          <TableContainer sx={{ maxHeight: 480 }}>
            <Table stickyHeader size="small" aria-label={t.table}>
              <TableHead>
                <TableRow>
                  <TableCell>{t.code}</TableCell>
                  <TableCell>{t.numeric}</TableCell>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>{t.minor}</TableCell>
                  <TableCell>{t.countries}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {matches.map((currency) => (
                  <TableRow key={currency.code}>
                    {currencyRow(currency, locale, countryName, t).map((cell, index) => (
                      <TableCell key={index}>{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      }
    />
  );
}
