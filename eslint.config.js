import eslint from '@eslint/js';
import tsEslint from 'typescript-eslint';

export default tsEslint.config(
  {
    ignores: ['eslint.config.js', 'eslint-import.config.js', 'dist/**'],
  },
  eslint.configs.recommended,
  ...tsEslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        parser: '@typescript-eslint/parser',
        project: ['./tsconfig.json', './tsconfig.dev.json'],
      },
    },
    settings: {},
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off'
    },
  },
);
