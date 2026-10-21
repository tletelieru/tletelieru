import { createTheme, type Theme } from '@mui/material/styles';

export function createToolTheme(): Theme {
  return createTheme({
    cssVariables: { colorSchemeSelector: '[data-theme="%s"]' },
    defaultColorScheme: 'dark',
    colorSchemes: {
      dark: {
        palette: {
          primary: { main: '#8ea1ff' },
          background: { default: '#17181c', paper: '#23262f' },
        },
      },
      light: {
        palette: {
          primary: { main: '#3b4fe4' },
          background: { default: '#ffffff', paper: '#f6f6f6' },
        },
      },
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: 'var(--sl-font, system-ui, sans-serif)',
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
      MuiButton: { defaultProps: { disableElevation: true } },
    },
  });
}

export const toolTheme = createToolTheme();
