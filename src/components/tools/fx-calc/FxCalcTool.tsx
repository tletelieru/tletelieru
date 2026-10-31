import { useCallback, useMemo } from 'react';
import { useLocale, useMessages } from '~/i18n/react';
import { calculateFx, fxSides, type FxOptions, type FxResult } from '~/lib/tools/fx-calc';
import { currencyOptions, findCurrency } from '~/lib/tools/iso-4217';
import { pickOption } from '~/lib/tools/sql/format';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { ChoiceToggle, SelectOption, TextOption, useSetter } from '../_shared/options';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { fxCalcMessages } from './messages';

type Messages = (typeof fxCalcMessages)['en'];

const defaults = {
  input: '',
  side: 'buy',
  base: 'USD',
  quote: 'CLP',
  rate: '950',
  spread: '1',
  fee: '0',
};

const PLACEHOLDER = '1000\n2500.50';

function report(
  { rates, lines }: FxResult,
  base: string,
  quote: string,
  side: FxOptions['side'],
  t: Messages,
): string {
  const header = [
    `${t.mid}: ${rates.mid} ${quote}/${base}`,
    `${t.effective}: ${rates.effective} ${quote}/${base}`,
    `${t.inverseMid}: ${rates.inverseMid} ${base}/${quote}`,
    `${t.inverseEffective}: ${rates.inverseEffective} ${base}/${quote}`,
  ];
  const final = side === 'buy' ? t.pays : t.receives;
  const body = lines.map(
    ({ amount, gross, fee, total, spreadCost }) =>
      `${amount} ${base} → ${t.gross} ${gross} · ${t.feeLine} ${fee} · ${final} ${total} ${quote} · ${t.cost} ${spreadCost}`,
  );
  return (lines.length > 0 ? [...header, '', ...body] : header).join('\n');
}

export default function FxCalcTool() {
  const t = useMessages(fxCalcMessages);
  const locale = useLocale();
  const [state, update] = useUrlState(defaults);
  const side = pickOption(state.side, fxSides, 'buy');
  const base = findCurrency(state.base)?.code ?? 'USD';
  const quoteCurrency = findCurrency(state.quote) ?? findCurrency('CLP');
  const quote = quoteCurrency?.code ?? 'CLP';
  const decimals = quoteCurrency?.minor ?? 2;

  const options: FxOptions = useMemo(
    () => ({ side, rate: state.rate, spread: state.spread, fee: state.fee, decimals }),
    [side, state.rate, state.spread, state.fee, decimals],
  );

  const result = useMemo(() => calculateFx(state.input, options), [state.input, options]);
  const preview = useMemo(() => {
    const sample = calculateFx(PLACEHOLDER, options);
    return 'error' in sample ? undefined : report(sample, base, quote, side, t);
  }, [options, base, quote, side, t]);

  const choices = useMemo(() => currencyOptions(locale), [locale]);
  const failed = 'error' in result;
  const active = state.input.trim() !== '';
  const invalid = failed ? [] : result.invalid;

  const onInput = useCallback((input: string) => update({ input }), [update]);
  const onSide = useSetter(update, 'side');
  const onBase = useSetter(update, 'base');
  const onQuote = useSetter(update, 'quote');
  const onRate = useSetter(update, 'rate');
  const onSpread = useSetter(update, 'spread');
  const onFee = useSetter(update, 'fee');

  const error = failed
    ? t.error[result.error]
    : invalid.map(({ line, text }) => t.invalid(line, text)).join(' · ');

  return (
    <ToolLayout
      options={
        <>
          <ChoiceToggle
            label={t.side}
            value={side}
            options={fxSides}
            labels={t.sides}
            onChange={onSide}
          />
          <SelectOption
            label={t.base}
            value={base}
            options={choices}
            onChange={onBase}
            width={240}
          />
          <SelectOption
            label={t.quote}
            value={quote}
            options={choices}
            onChange={onQuote}
            width={240}
          />
          <TextOption
            label={t.rate(base, quote)}
            value={state.rate}
            onChange={onRate}
            width={210}
          />
          <TextOption label={t.spread} value={state.spread} onChange={onSpread} width={110} />
          <TextOption label={t.fee(quote)} value={state.fee} onChange={onFee} width={130} />
        </>
      }
      input={
        <InputPanel
          label={t.input(base)}
          placeholder={PLACEHOLDER}
          value={state.input}
          onChange={onInput}
          minRows={4}
        />
      }
      output={
        <OutputPanel
          value={!failed && active ? report(result, base, quote, side, t) : ''}
          placeholder={preview}
          error={error !== '' ? error : null}
        />
      }
    />
  );
}
