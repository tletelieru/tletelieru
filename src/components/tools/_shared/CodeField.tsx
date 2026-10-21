import TextField, { type TextFieldProps } from '@mui/material/TextField';

export function CodeField({ slotProps, ...props }: TextFieldProps) {
  return (
    <TextField
      multiline
      minRows={6}
      maxRows={24}
      {...props}
      slotProps={{
        ...slotProps,
        htmlInput: {
          spellCheck: false,
          style: { fontFamily: 'var(--sl-font-mono, ui-monospace, monospace)', fontSize: 14 },
          ...(slotProps?.htmlInput as object | undefined),
        },
      }}
    />
  );
}
