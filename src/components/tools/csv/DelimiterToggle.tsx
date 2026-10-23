import { useCallback } from 'react';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useMessages } from '~/i18n/react';
import type { CsvDelimiter } from '~/lib/tools/csv';
import { csvMessages } from './messages';

interface DelimiterToggleProps {
  value: CsvDelimiter;
  onChange: (value: CsvDelimiter) => void;
  auto?: boolean;
}

export function DelimiterToggle({ value, onChange, auto = true }: DelimiterToggleProps) {
  const t = useMessages(csvMessages);
  const onToggle = useCallback(
    (_: unknown, next: CsvDelimiter | null) => {
      if (next) onChange(next);
    },
    [onChange],
  );
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      onChange={onToggle}
      aria-label={t.delimiter}
    >
      {auto && <ToggleButton value="auto">{t.auto}</ToggleButton>}
      <ToggleButton value="comma">{t.comma}</ToggleButton>
      <ToggleButton value="semicolon">{t.semicolon}</ToggleButton>
      <ToggleButton value="tab">{t.tab}</ToggleButton>
    </ToggleButtonGroup>
  );
}
