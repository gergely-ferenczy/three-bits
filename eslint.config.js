/* eslint-disable import-x/no-named-as-default-member */
/* eslint-disable import-x/no-named-as-default */

import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importX, { createNodeResolver } from 'eslint-plugin-import-x';
import reactHooksEslint from 'eslint-plugin-react-hooks';
import storybook from 'eslint-plugin-storybook';
import tsEslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['**/dist', 'coverage'],
  },
  eslint.configs.recommended,
  ...tsEslint.configs.recommendedTypeChecked,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  reactHooksEslint.configs.flat.recommended,
  // @ts-expect-error eslint-plugin-storybook uses legacy RuleModule types incompatible with eslint's new RuleDefinition
  ...storybook.configs['flat/recommended'],
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver(), createNodeResolver()],
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',

      'import-x/order': [
        'warn',
        {
          groups: ['builtin', 'external', ['parent', 'sibling', 'index', 'object', 'type']],
          alphabetize: {
            order: 'asc',
            orderImportKind: 'asc',
          },
          'newlines-between': 'ignore',
        },
      ],
    },
  },
);
