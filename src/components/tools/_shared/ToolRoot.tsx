import type { ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { toolTheme } from '~/lib/mui/theme';

const starlightOwnsColorScheme = { colorSchemeNode: null, storageManager: null };

export function ToolRoot({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={toolTheme} {...starlightOwnsColorScheme} disableTransitionOnChange>
      <div className="not-content tool-root">{children}</div>
    </ThemeProvider>
  );
}
