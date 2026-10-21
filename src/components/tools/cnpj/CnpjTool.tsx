import { useCallback, useState, type ChangeEvent } from 'react';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import { useMessages } from '~/i18n/react';
import { formatCnpj, generateCnpjs, validateCnpj } from '~/lib/tools/cnpj';
import type { FormatStyle } from '~/lib/tools/ids/shared';
import { useUrlState } from '~/lib/url-state';
import { clampCount, IdLinesTool, idLinesDefaults } from '../ids/IdLinesTool';
import { cnpjMessages } from './messages';

const defaults = { ...idLinesDefaults, alphanumeric: false };

const styles = ['full', 'dash', 'plain'] as const;

function formatLine(line: string, style: FormatStyle): string | null {
  return formatCnpj(line, { style });
}

function generate(count: number, alphanumeric: boolean): string[] {
  return generateCnpjs({ count: clampCount(count), style: 'plain', alphanumeric });
}

export default function CnpjTool() {
  const t = useMessages(cnpjMessages);
  const [state, update] = useUrlState(defaults);
  const [generated, setGenerated] = useState(() => generate(state.count, state.alphanumeric));

  const onRegenerate = useCallback(
    (count: number) => setGenerated(generate(count, state.alphanumeric)),
    [state.alphanumeric],
  );

  const onAlphanumericChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const alphanumeric = event.target.checked;
      update({ alphanumeric });
      setGenerated(generate(state.count, alphanumeric));
    },
    [update, state.count],
  );

  return (
    <IdLinesTool
      state={state}
      onPatch={update}
      generated={generated}
      onRegenerate={onRegenerate}
      validate={validateCnpj}
      format={formatLine}
      noun={t.noun}
      inputLabel={t.inputLabel}
      placeholder={'11.222.333/0001-81\n12ABC34501DE35\n00.000.000/0000-00'}
      styles={styles}
      generateOptions={
        <FormControlLabel
          control={<Switch checked={state.alphanumeric} onChange={onAlphanumericChange} />}
          label={t.alphanumeric}
        />
      }
    />
  );
}
