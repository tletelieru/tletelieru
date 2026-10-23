import { useCallback } from 'react';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useMessages } from '~/i18n/react';
import type { MongoStyle, QueryTarget } from '~/lib/tools/mongo/filter';
import { sqlMessages } from './messages';

interface TargetToggleProps {
  value: QueryTarget;
  onChange: (value: QueryTarget) => void;
}

export function TargetToggle({ value, onChange }: TargetToggleProps) {
  const t = useMessages(sqlMessages);
  const onToggle = useCallback(
    (_: unknown, next: QueryTarget | null) => {
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
      aria-label={t.target}
    >
      <ToggleButton value="sql">SQL</ToggleButton>
      <ToggleButton value="mongo">MongoDB</ToggleButton>
    </ToggleButtonGroup>
  );
}

interface MongoStyleToggleProps {
  value: MongoStyle;
  onChange: (value: MongoStyle) => void;
}

export function MongoStyleToggle({ value, onChange }: MongoStyleToggleProps) {
  const t = useMessages(sqlMessages);
  const onToggle = useCallback(
    (_: unknown, next: MongoStyle | null) => {
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
      aria-label={t.mongoStyle}
    >
      <ToggleButton value="pretty">{t.pretty}</ToggleButton>
      <ToggleButton value="compact">{t.compact}</ToggleButton>
    </ToggleButtonGroup>
  );
}
