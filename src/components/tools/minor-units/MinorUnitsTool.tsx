import { useCallback, useMemo } from 'react';
import Typography from '@mui/material/Typography';
import { useLocale, useMessages } from '~/i18n/react';
import { currencyOptions, findCurrency } from '~/lib/tools/iso-4217';
import {
  convertMinorUnits,
  minorDirections,
  minorRoundings,
  type MinorDirection,
  type MinorOptions,
} from '~/lib/tools/minor-units';
import { pickOption } from '~/lib/tools/sql/format';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { ChoiceToggle, SelectOption, useSetter } from '../_shared/options';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { minorUnitsMessages } from './messages';

const defaults = { input: '', currency: 'USD', direction: 'toMinor', rounding: 'strict' };

function sample(direction: MinorDirection, exponent: number): string {
  if (direction === 'toAmount') return '123456\n1999';
  const fraction = '5678'.slice(0, exponent);
  return exponent > 0 ? `1234.${fraction}\n19` : '1234\n19';
}

export default function MinorUnitsTool() {
  const t = useMessages(minorUnitsMessages);
  const locale = useLocale();
  const [state, update] = useUrlState(defaults);
  const direction = pickOption(state.direction, minorDirections, 'toMinor');
  const rounding = pickOption(state.rounding, minorRoundings, 'strict');
  const currency = findCurrency(state.currency) ?? findCurrency('USD');
  const exponent = currency?.minor ?? 2;

  const options: MinorOptions = useMemo(
    () => ({ exponent, direction, rounding }),
    [exponent, direction, rounding],
  );
  const placeholder = sample(direction, exponent);
  const result = useMemo(() => convertMinorUnits(state.input, options), [state.input, options]);
  const preview = useMemo(
    () => convertMinorUnits(placeholder, options).output,
    [placeholder, options],
  );
  const choices = useMemo(() => currencyOptions(locale), [locale]);

  const onInput = useCallback((input: string) => update({ input }), [update]);
  const onCurrency = useSetter(update, 'currency');
  const onDirection = useSetter(update, 'direction');
  const onRounding = useSetter(update, 'rounding');

  return (
    <ToolLayout
      options={
        <>
          <ChoiceToggle
            label={t.direction}
            value={direction}
            options={minorDirections}
            labels={t.directions}
            onChange={onDirection}
          />
          <SelectOption
            label={t.currency}
            value={currency?.code ?? 'USD'}
            options={choices}
            onChange={onCurrency}
            width={260}
          />
          {direction === 'toMinor' && (
            <ChoiceToggle
              label={t.rounding}
              value={rounding}
              options={minorRoundings}
              labels={t.roundings}
              onChange={onRounding}
            />
          )}
        </>
      }
      input={
        <InputPanel
          label={direction === 'toMinor' ? t.amounts : t.minorValues}
          placeholder={placeholder}
          value={state.input}
          onChange={onInput}
        />
      }
      output={
        <OutputPanel
          value={result.output}
          placeholder={preview}
          error={result.errors.length > 0 ? result.errors.map(t.error).join(' · ') : null}
          actions={
            <Typography variant="body2" color="text.secondary">
              {t.decimals(exponent)}
            </Typography>
          }
        />
      }
    />
  );
}
