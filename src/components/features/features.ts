import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export const featureComponents: Record<string, LazyExoticComponent<ComponentType>> = {
  pipeline: lazy(() => import('../pipeline/PipelineTool')),
  snippets: lazy(() => import('../snippets/SnippetsPage')),
  'smart-paste': lazy(() => import('../smart-paste/SmartPastePanel')),
};

export const featuresWithShortcuts: ReadonlySet<string> = new Set(['pipeline']);
