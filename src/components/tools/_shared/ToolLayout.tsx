import type { ReactNode } from 'react';
import Stack from '@mui/material/Stack';

interface ToolLayoutProps {
  options?: ReactNode;
  input?: ReactNode;
  output: ReactNode;
}

export function ToolLayout({ options, input, output }: ToolLayoutProps) {
  return (
    <Stack spacing={2}>
      {options ? (
        <Stack
          direction="row"
          spacing={2}
          useFlexGap
          sx={{ flexWrap: 'wrap', alignItems: 'center' }}
        >
          {options}
        </Stack>
      ) : null}
      {input}
      {output}
    </Stack>
  );
}
