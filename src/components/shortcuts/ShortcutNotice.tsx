import { useState, type SyntheticEvent } from 'react';
import Snackbar, { type SnackbarCloseReason } from '@mui/material/Snackbar';

export function ShortcutNotice({
  notice,
  onClose,
}: {
  notice: string | null;
  onClose: () => void;
}) {
  const [shown, setShown] = useState(notice);
  if (notice !== null && notice !== shown) setShown(notice);

  const handleClose = (_event: SyntheticEvent | Event, reason?: SnackbarCloseReason) => {
    if (reason === 'clickaway') return;
    onClose();
  };

  return (
    <Snackbar
      open={notice !== null}
      message={shown}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    />
  );
}
