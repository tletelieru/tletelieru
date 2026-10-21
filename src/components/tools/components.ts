import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export const toolComponents: Record<string, LazyExoticComponent<ComponentType>> = {
  rut: lazy(() => import('./rut/RutTool')),
};
