import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import local from './eslint-rules/index.js';

export default defineConfig([
  globalIgnores(['dist/', '.astro/', 'dev-dist/', 'coverage/', 'node_modules/']),
  js.configs.recommended,
  tseslint.configs.strict,
  astro.configs.recommended,
  {
    files: ['**/*.tsx'],
    extends: [
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      reactHooks.configs.flat.recommended,
    ],
    settings: { react: { version: '19.3' } },
  },
  {
    files: ['**/*.tsx', '**/*.astro'],
    plugins: { local },
    rules: {
      'local/prefer-logical-and': 'error',
      'local/no-leaked-length': 'error',
    },
  },
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
]);
