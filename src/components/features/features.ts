import type { ComponentType } from 'react';
import { createModuleCache } from '../module-cache';

type FeatureModule = { default: ComponentType };

export const featureLoaders: Record<string, () => Promise<FeatureModule>> = {
  pipeline: () => import('../pipeline/PipelineTool'),
  snippets: () => import('../snippets/SnippetsPage'),
  'smart-paste': () => import('../smart-paste/SmartPastePanel'),
};

export const featureModules = createModuleCache(featureLoaders);

export const featuresWithShortcuts: ReadonlySet<string> = new Set(['pipeline']);
