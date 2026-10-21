import { useCallback, useState } from 'react';
import { useMessages } from '~/i18n/react';
import { formatCpf, generateCpfs, validateCpf } from '~/lib/tools/cpf';
import type { FormatStyle } from '~/lib/tools/ids/shared';
import { useUrlState } from '~/lib/url-state';
import { clampCount, IdLinesTool, idLinesDefaults } from '../ids/IdLinesTool';
import { cpfMessages } from './messages';

const styles = ['full', 'dash', 'plain'] as const;

function formatLine(line: string, style: FormatStyle): string | null {
  return formatCpf(line, { style });
}

function generate(count: number): string[] {
  return generateCpfs({ count: clampCount(count), style: 'plain' });
}

export default function CpfTool() {
  const t = useMessages(cpfMessages);
  const [state, update] = useUrlState(idLinesDefaults);
  const [generated, setGenerated] = useState(() => generate(state.count));

  const onRegenerate = useCallback((count: number) => setGenerated(generate(count)), []);

  return (
    <IdLinesTool
      state={state}
      onPatch={update}
      generated={generated}
      onRegenerate={onRegenerate}
      validate={validateCpf}
      format={formatLine}
      noun={t.noun}
      inputLabel={t.inputLabel}
      placeholder={'529.982.247-25\n11144477735\n111.111.111-11'}
      styles={styles}
    />
  );
}
