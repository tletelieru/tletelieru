import { useState } from 'react';
import TextField, { type TextFieldProps } from '@mui/material/TextField';

export function NumberField({ value, onChange, onBlur, ...props }: TextFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <TextField
      {...props}
      type="number"
      value={draft ?? value}
      onChange={(event) => {
        setDraft(event.target.value);
        if (event.target.value !== '') onChange?.(event);
      }}
      onBlur={(event) => {
        setDraft(null);
        onBlur?.(event);
      }}
    />
  );
}
