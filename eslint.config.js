// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';

import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tsEslint from 'typescript-eslint';
import unusedImports from 'eslint-plugin-unused-imports';

export default defineConfig(
  globalIgnores(['!.storybook'], 'Include Storybook Directory'),
  {
    ignores: ['dist/**', 'coverage/**'],
  },
  eslint.configs.recommended,
  ...tsEslint.configs.recommendedTypeChecked,
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
    settings: {},
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
