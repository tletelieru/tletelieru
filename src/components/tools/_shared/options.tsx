import { useCallback, type ChangeEvent } from 'react';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useMessages } from '~/i18n/react';
import { numberFormatChoices, type NumberFormatChoice } from '~/lib/tools/_shared/localized-number';
import { numberFormatMessages } from './messages';

export function useSetter<T, K extends keyof T>(update: (patch: Partial<T>) => void, key: K) {
  return useCallback(
    (value: T[K]) => update({ [key]: value } as unknown as Partial<T>),
    [update, key],
  );
}

interface ChoiceToggleProps<T extends string> {
  label: string;
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T) => void;
}

export function ChoiceToggle<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
}: ChoiceToggleProps<T>) {
  const onToggle = useCallback(
    (_: unknown, next: T | null) => {
      if (next) onChange(next);
    },
    [onChange],
  );
  return (
    <ToggleButtonGroup exclusive size="small" value={value} onChange={onToggle} aria-label={label}>
      {options.map((option) => (
        <ToggleButton key={option} value={option}>
          {labels[option]}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

interface TextOptionProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  width?: number;
  placeholder?: string;
  type?: 'text' | 'password';
}

export function TextOption({
  label,
  value,
  onChange,
  width = 140,
  placeholder,
  type = 'text',
}: TextOptionProps) {
  const onField = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
    [onChange],
  );
  return (
    <TextField
      size="small"
      type={type}
      label={label}
      value={value}
      placeholder={placeholder}
      autoComplete="off"
      sx={{ width }}
      slotProps={{ inputLabel: { shrink: true } }}
      onChange={onField}
    />
  );
}

interface SelectOptionProps {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  width?: number;
}

export function SelectOption({ label, value, options, onChange, width = 200 }: SelectOptionProps) {
  const onField = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
    [onChange],
  );
  return (
    <TextField select size="small" label={label} value={value} sx={{ width }} onChange={onField}>
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

interface SwitchOptionProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function SwitchOption({ label, checked, onChange }: SwitchOptionProps) {
  const onField = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked),
    [onChange],
  );
  return (
    <FormControlLabel control={<Switch checked={checked} onChange={onField} />} label={label} />
  );
}

interface NumberFormatToggleProps {
  value: NumberFormatChoice;
  onChange: (value: string) => void;
}

export function NumberFormatToggle({ value, onChange }: NumberFormatToggleProps) {
  const t = useMessages(numberFormatMessages);
  return (
    <ChoiceToggle
      label={t.label}
      value={value}
      options={numberFormatChoices}
      labels={t.formats}
      onChange={onChange}
    />
  );
}
