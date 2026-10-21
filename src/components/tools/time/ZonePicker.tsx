import { useCallback, useMemo, type SyntheticEvent } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { useMessages } from '~/i18n/react';
import { listTimeZones } from '~/lib/tools/time/zones';
import { zonePickerMessages } from './messages';

const ZONES = listTimeZones();

function withValues(values: string[]): string[] {
  const missing = values.filter((value) => value && !ZONES.includes(value));
  return missing.length ? [...missing, ...ZONES] : ZONES;
}

interface ZonePickerProps {
  label: string;
  value: string;
  onChange: (zone: string) => void;
  width?: number;
}

export function ZonePicker({ label, value, onChange, width = 280 }: ZonePickerProps) {
  const t = useMessages(zonePickerMessages);
  const options = useMemo(() => withValues([value]), [value]);
  const handleChange = useCallback(
    (_: SyntheticEvent, zone: string | null) => {
      if (zone) onChange(zone);
    },
    [onChange],
  );
  return (
    <Autocomplete
      autoHighlight
      disableClearable
      options={options}
      value={value}
      onChange={handleChange}
      openText={t.open}
      closeText={t.close}
      noOptionsText={t.noOptions}
      sx={{ width }}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );
}

interface ZoneMultiPickerProps {
  label: string;
  value: string[];
  onChange: (zones: string[]) => void;
}

export function ZoneMultiPicker({ label, value, onChange }: ZoneMultiPickerProps) {
  const t = useMessages(zonePickerMessages);
  const options = useMemo(() => withValues(value), [value]);
  const handleChange = useCallback(
    (_: SyntheticEvent, zones: string[]) => onChange(zones),
    [onChange],
  );
  return (
    <Autocomplete
      multiple
      autoHighlight
      filterSelectedOptions
      options={options}
      value={value}
      onChange={handleChange}
      openText={t.open}
      closeText={t.close}
      clearText={t.clear}
      noOptionsText={t.noOptions}
      sx={{ minWidth: 280, flexGrow: 1 }}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );
}
