import { Suspense } from 'react';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import { toLocale } from '~/i18n/locales';
import { LocaleProvider } from '~/i18n/react';
import { sharedMessages } from '../tools/_shared/messages';
import { ToolProvider } from '../tools/_shared/ToolContext';
import { ToolFrame } from '../tools/_shared/ToolFrame';
import { ToolRoot } from '../tools/_shared/ToolRoot';
import { featureComponents, featuresWithShortcuts } from './features';

export default function FeatureIsland({ name, locale }: { name: string; locale?: string }) {
  const lang = toLocale(locale);
  const Feature = featureComponents[name];
  const content = Feature ? (
    <Suspense fallback={<LinearProgress />}>
      <Feature />
    </Suspense>
  ) : (
    <Alert severity="error">{sharedMessages[lang].unknownFeature(name)}</Alert>
  );
  return (
    <LocaleProvider locale={lang}>
      <ToolProvider slug={null}>
        <ToolRoot>
          {featuresWithShortcuts.has(name) ? <ToolFrame>{content}</ToolFrame> : content}
        </ToolRoot>
      </ToolProvider>
    </LocaleProvider>
  );
}
