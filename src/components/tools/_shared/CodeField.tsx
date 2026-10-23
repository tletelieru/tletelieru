import TextField, { type TextFieldProps } from '@mui/material/TextField';

type CodeFieldProps = Omit<TextFieldProps, 'rows' | 'maxRows'> & { minRows?: number };

export function CodeField({ slotProps, minRows = 8, ...props }: CodeFieldProps) {
  return (
    <TextField
      multiline
      rows={minRows}
      {...props}
      slotProps={{
        ...slotProps,
        input: { inputComponent: 'textarea', ...(slotProps?.input as object | undefined) },
        htmlInput: {
          spellCheck: false,
          style: {
            fontFamily: 'var(--sl-font-mono, ui-monospace, monospace)',
            fontSize: 14,
            resize: 'vertical',
          },
          ...(slotProps?.htmlInput as object | undefined),
        },
      }}
    />
  );
}
