import Alert from '@mui/material/Alert';
import { toLocale } from '~/i18n/locales';
import { LocaleProvider } from '~/i18n/react';
import { sharedMessages } from '../tools/_shared/messages';
import { ToolProvider } from '../tools/_shared/ToolContext';
import { ToolFrame } from '../tools/_shared/ToolFrame';
import { ToolRoot } from '../tools/_shared/ToolRoot';
import { featureModules, featuresWithShortcuts } from './features';

function LoadedFeature({ name }: { name: string }) {
  return featureModules.render(name);
}

export default function FeatureIsland({ name, locale }: { name: string; locale?: string }) {
  const lang = toLocale(locale);
  const content = featureModules.has(name) ? (
    <LoadedFeature name={name} />
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
