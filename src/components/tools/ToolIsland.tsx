import { Suspense } from 'react';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import { toLocale } from '~/i18n/locales';
import { LocaleProvider } from '~/i18n/react';
import { toolComponents } from './components';
import { sharedMessages } from './_shared/messages';
import { ToolRoot } from './_shared/ToolRoot';

export default function ToolIsland({ slug, locale }: { slug: string; locale?: string }) {
  const lang = toLocale(locale);
  const Tool = toolComponents[slug];
  return (
    <LocaleProvider locale={lang}>
      <ToolRoot>
        {Tool ? (
          <Suspense fallback={<LinearProgress />}>
            <Tool />
          </Suspense>
        ) : (
          <Alert severity="error">{sharedMessages[lang].unknownTool(slug)}</Alert>
        )}
      </ToolRoot>
    </LocaleProvider>
  );
}
