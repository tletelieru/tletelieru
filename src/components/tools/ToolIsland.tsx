import Alert from '@mui/material/Alert';
import { toLocale } from '~/i18n/locales';
import { LocaleProvider } from '~/i18n/react';
import { toolModules } from './components';
import { sharedMessages } from './_shared/messages';
import { ToolProvider } from './_shared/ToolContext';
import { ToolFrame } from './_shared/ToolFrame';
import { ToolRoot } from './_shared/ToolRoot';

function LoadedTool({ slug }: { slug: string }) {
  return toolModules.render(slug);
}

export default function ToolIsland({ slug, locale }: { slug: string; locale?: string }) {
  const lang = toLocale(locale);
  return (
    <LocaleProvider locale={lang}>
      <ToolProvider slug={slug}>
        <ToolRoot>
          <ToolFrame>
            {toolModules.has(slug) ? (
              <LoadedTool slug={slug} />
            ) : (
              <Alert severity="error">{sharedMessages[lang].unknownTool(slug)}</Alert>
            )}
          </ToolFrame>
        </ToolRoot>
      </ToolProvider>
    </LocaleProvider>
  );
}
