import { useMemo, type ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { createToolTheme } from '~/lib/mui/theme';
import { useStarlightTheme } from '~/lib/mui/useStarlightTheme';

export function ToolRoot({ children }: { children: ReactNode }) {
  const mode = useStarlightTheme();
  const theme = useMemo(() => createToolTheme(mode), [mode]);
  return (
    <ThemeProvider theme={theme}>
      <div className="not-content tool-root">{children}</div>
    </ThemeProvider>
  );
}
