import { useCallback, useDeferredValue, useMemo, useState, type MouseEvent } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useLocale, useMessages } from '~/i18n/react';
import { detectInput } from '~/lib/detect';
import { buildToolLink, followToolLink, type ToolLink } from '~/lib/handoff';
import { getCategory, getTool, toolPath, withBase, type ToolMeta } from '~/lib/tools/registry';
import type { Detection } from '~/lib/detect/detectors';
import { InputPanel } from '../tools/_shared/InputPanel';
import { smartPasteMessages } from './messages';

interface Match {
  tool: ToolMeta;
  detection: Detection;
  link: ToolLink;
}

export default function SmartPastePanel() {
  const t = useMessages(smartPasteMessages);
  const locale = useLocale();
  const [input, setInput] = useState('');
  const deferred = useDeferredValue(input);

  const matches = useMemo(() => {
    const result: Match[] = [];
    for (const detection of detectInput(deferred)) {
      const tool = getTool(detection.slug);
      if (tool) {
        result.push({
          tool,
          detection,
          link: buildToolLink(
            withBase(import.meta.env.BASE_URL, toolPath(tool, locale)),
            detection.params,
            detection.sensitive ? 0 : undefined,
          ),
        });
      }
    }
    return result;
  }, [deferred, locale]);

  const onOpen = useCallback((event: MouseEvent<HTMLElement>, link: ToolLink) => {
    if (!link.handoff) return;
    event.preventDefault();
    followToolLink(link);
  }, []);

  const isEmpty = deferred.trim() === '';

  return (
    <Stack spacing={2}>
      <InputPanel
        value={input}
        onChange={setInput}
        label={t.input}
        placeholder={t.placeholder}
        minRows={6}
      />
      {isEmpty && <Alert severity="info">{t.empty}</Alert>}
      {!isEmpty && matches.length === 0 && <Alert severity="warning">{t.noMatch}</Alert>}
      {matches.length > 0 && (
        <Stack spacing={1.5}>
          <Typography variant="subtitle2">{t.detected(matches.length)}</Typography>
          {matches.map((match, position) => (
            <Card key={match.tool.slug} variant="outlined">
              <CardContent sx={{ pb: 1 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography variant="h6" component="h3" sx={{ fontSize: '1.05rem' }}>
                    {match.tool.name[locale]}
                  </Typography>
                  {position === 0 && <Chip size="small" color="primary" label={t.best} />}
                  <Chip
                    size="small"
                    variant="outlined"
                    label={t.confidence(Math.round(match.detection.confidence * 100))}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {getCategory(match.tool.category).label[locale]} ·{' '}
                  {match.tool.description[locale]}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  href={match.link.href}
                  onClick={(event: MouseEvent<HTMLElement>) => onOpen(event, match.link)}
                  variant={position === 0 ? 'contained' : 'outlined'}
                  size="small"
                  aria-label={`${t.open} ${match.tool.name[locale]}`}
                >
                  {t.open}
                </Button>
              </CardActions>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
