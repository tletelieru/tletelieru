import { createTheme, type Theme } from '@mui/material/styles';

export type ColorMode = 'light' | 'dark';

export function createToolTheme(mode: ColorMode): Theme {
  return createTheme({
    palette: {
      mode,
      primary: { main: mode === 'dark' ? '#8ea1ff' : '#3b4fe4' },
      background:
        mode === 'dark'
          ? { default: '#17181c', paper: '#23262f' }
          : { default: '#ffffff', paper: '#f6f6f6' },
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
