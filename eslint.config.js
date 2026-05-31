/* eslint-disable import-x/no-named-as-default-member */
/* eslint-disable import-x/no-named-as-default */

import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importX, { createNodeResolver } from 'eslint-plugin-import-x';
import storybook from 'eslint-plugin-storybook';
import unusedImports from 'eslint-plugin-unused-imports';
import tsEslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['!.storybook'], 'Include Storybook Directory'),
  {
    ignores: ['dist/**', 'coverage/**'],
  },
  eslint.configs.recommended,
  ...tsEslint.configs.recommendedTypeChecked,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  storybook.configs['flat/recommended'],
  {
    // eslint-plugin-unused-imports not have a flat config
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      'unused-imports/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'warn',
    },
  },
  {
    languageOptions: {
      parserOptions: {
        parser: '@typescript-eslint/parser',
        project: ['./tsconfig.json', './tsconfig.dev.json', './tsconfig.storybook.json'],
      },
    },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver(), createNodeResolver()],
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
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
