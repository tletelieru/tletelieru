import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export const toolComponents: Record<string, LazyExoticComponent<ComponentType>> = {
  rut: lazy(() => import('./rut/RutTool')),
  cpf: lazy(() => import('./cpf/CpfTool')),
  cnpj: lazy(() => import('./cnpj/CnpjTool')),
  'national-id': lazy(() => import('./national-id/NationalIdTool')),
  'sql-in-text': lazy(() => import('./sql-in-text/SqlInTextTool')),
  'sql-in-numbers': lazy(() => import('./sql-in-numbers/SqlInNumbersTool')),
  'sql-like': lazy(() => import('./sql-like/SqlLikeTool')),
  'sql-json': lazy(() => import('./sql-json/SqlJsonTool')),
  'sql-list': lazy(() => import('./sql-list/SqlListTool')),
  timezone: lazy(() => import('./timezone/TimezoneTool')),
  unix: lazy(() => import('./unix/UnixTool')),
  case: lazy(() => import('./case/CaseTool')),
  json: lazy(() => import('./json/JsonTool')),
  html: lazy(() => import('./html/HtmlTool')),
};
