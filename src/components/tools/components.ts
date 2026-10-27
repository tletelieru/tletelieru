import type { ComponentType } from 'react';
import { createModuleCache } from '../module-cache';

type ToolModule = { default: ComponentType };

export const toolLoaders: Record<string, () => Promise<ToolModule>> = {
  rut: () => import('./rut/RutTool'),
  cpf: () => import('./cpf/CpfTool'),
  cnpj: () => import('./cnpj/CnpjTool'),
  'national-id': () => import('./national-id/NationalIdTool'),
  'sql-in-text': () => import('./sql-in-text/SqlInTextTool'),
  'sql-in-numbers': () => import('./sql-in-numbers/SqlInNumbersTool'),
  'sql-like': () => import('./sql-like/SqlLikeTool'),
  'sql-json': () => import('./sql-json/SqlJsonTool'),
  'sql-list': () => import('./sql-list/SqlListTool'),
  timezone: () => import('./timezone/TimezoneTool'),
  unix: () => import('./unix/UnixTool'),
  case: () => import('./case/CaseTool'),
  json: () => import('./json/JsonTool'),
  html: () => import('./html/HtmlTool'),
  hash: () => import('./hash/HashTool'),
  jwt: () => import('./jwt/JwtTool'),
  uuid: () => import('./uuid/UuidTool'),
  base64: () => import('./base64/Base64Tool'),
  url: () => import('./url/UrlTool'),
  'html-entities': () => import('./html-entities/HtmlEntitiesTool'),
  'json-escape': () => import('./json-escape/JsonEscapeTool'),
  'sql-format': () => import('./sql-format/SqlFormatTool'),
  'csv-insert': () => import('./csv-insert/CsvInsertTool'),
  'sql-any': () => import('./sql-any/SqlAnyTool'),
  'csv-json': () => import('./csv-json/CsvJsonTool'),
  'csv-table': () => import('./csv-table/CsvTableTool'),
  'json-types': () => import('./json-types/JsonTypesTool'),
  'json-path': () => import('./json-path/JsonPathTool'),
  'yaml-json': () => import('./yaml-json/YamlJsonTool'),
  regex: () => import('./regex/RegexTool'),
  'text-diff': () => import('./text-diff/TextDiffTool'),
  'json-diff': () => import('./json-diff/JsonDiffTool'),
  cron: () => import('./cron/CronTool'),
  totp: () => import('./totp/TotpTool'),
  'curl-convert': () => import('./curl-convert/CurlConvertTool'),
  'number-base': () => import('./number-base/NumberBaseTool'),
  password: () => import('./password/PasswordTool'),
  color: () => import('./color/ColorTool'),
};

export const toolModules = createModuleCache(toolLoaders);
