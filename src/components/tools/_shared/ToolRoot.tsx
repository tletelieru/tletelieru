import type { ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { toolTheme } from '~/lib/mui/theme';

export function ToolRoot({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={toolTheme} disableTransitionOnChange>
      <div className="not-content tool-root">{children}</div>
    </ThemeProvider>
  );
}
