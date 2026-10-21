import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { CopyButton } from '../_shared/CopyButton';

interface CaseListProps {
  label: string;
  items: { id: string; label: string; value: string }[];
}

export function CaseList({ label, items }: CaseListProps) {
  return (
    <Paper variant="outlined" component="ul" aria-label={label} sx={{ m: 0, p: 0 }}>
      {items.map((item) => (
        <Stack
          key={item.id}
          component="li"
          direction="row"
          spacing={2}
          sx={{
            alignItems: 'center',
            px: 2,
            py: 1,
            listStyle: 'none',
            '&:not(:last-of-type)': { borderBottom: 1, borderColor: 'divider' },
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ width: 140, flexShrink: 0 }}>
            {item.label}
          </Typography>
          <Typography
            component="code"
            sx={{
              flexGrow: 1,
              fontFamily: 'var(--sl-font-mono, ui-monospace, monospace)',
              fontSize: 14,
              wordBreak: 'break-all',
            }}
          >
            {item.value}
          </Typography>
          <CopyButton text={item.value} />
        </Stack>
      ))}
    </Paper>
  );
}
