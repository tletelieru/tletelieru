import {
  useCallback,
  useMemo,
  useState,
  type HTMLAttributes,
  type Key,
  type SyntheticEvent,
} from 'react';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { useMessages } from '~/i18n/react';
import { listTimeZones, zoneOffsetLabel } from '~/lib/tools/time/zones';
import { zonePickerMessages } from './messages';

const ZONES = listTimeZones();

function withValues(values: string[]): string[] {
  const missing = values.filter((value) => value && !ZONES.includes(value));
  return missing.length ? [...missing, ...ZONES] : ZONES;
}

export function zoneSearchText(zone: string, epochMs: number): string {
  return `${zone} ${zone.replace(/_/g, ' ')} ${zoneOffsetLabel(zone, epochMs)}`;
}

function useZoneOptions(epochMs: number) {
  const filterOptions = useMemo(
    () => createFilterOptions<string>({ stringify: (zone) => zoneSearchText(zone, epochMs) }),
    [epochMs],
  );
  const renderOption = useCallback(
    ({ key, ...props }: HTMLAttributes<HTMLLIElement> & { key: Key }, zone: string) => (
      <Box component="li" key={key} {...props} sx={{ display: 'flex', gap: 2 }}>
        <Box component="span" sx={{ flexGrow: 1 }}>
          {zone}
        </Box>
        <Box
          component="span"
          aria-hidden
          sx={{
            color: 'text.secondary',
            fontFamily: 'var(--sl-font-mono, monospace)',
            fontSize: '0.85em',
          }}
        >
          {zoneOffsetLabel(zone, epochMs)}
        </Box>
      </Box>
    ),
    [epochMs],
  );
  return { filterOptions, renderOption };
}

interface ZonePickerProps {
  label: string;
  value: string;
  onChange: (zone: string) => void;
  width?: number;
}

export function ZonePicker({ label, value, onChange, width = 320 }: ZonePickerProps) {
  const t = useMessages(zonePickerMessages);
  const [now] = useState(() => Date.now());
  const options = useMemo(() => withValues([value]), [value]);
  const { filterOptions, renderOption } = useZoneOptions(now);
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
      filterOptions={filterOptions}
      renderOption={renderOption}
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
  const [now] = useState(() => Date.now());
  const options = useMemo(() => withValues(value), [value]);
  const { filterOptions, renderOption } = useZoneOptions(now);
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
      filterOptions={filterOptions}
      renderOption={renderOption}
      openText={t.open}
      closeText={t.close}
      clearText={t.clear}
      noOptionsText={t.noOptions}
      sx={{ minWidth: 280, flexGrow: 1 }}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );
}
